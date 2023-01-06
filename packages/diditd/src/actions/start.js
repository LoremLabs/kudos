import * as PeerIdFactory from "@libp2p/peer-id-factory";

import { TOPIC_HEARTBEAT, topics } from "../lib/gossip/topics";
import { colorForNode, toHex } from "../lib/utils.js";

import { IA_VERSION } from "../lib/protocols";
import { bootstrap } from "@libp2p/bootstrap";
import { msgId as calcMsgId } from "@libp2p/pubsub/utils";
import chalk from "chalk";
import cluster from "node:cluster";
import { createLibp2p } from "libp2p";
import { gossipsub } from "../lib/gossip/index.js";
// import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";
// import { logger } from "@libp2p/logger";
import { mdns } from "@libp2p/mdns";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import process from "node:process";
import { prometheusMetrics } from "@libp2p/prometheus-metrics";
import stringHash from "string-hash";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { webRTCStar } from "@libp2p/webrtc-star";
import { webSockets } from "@libp2p/websockets";

// import { createHdKeyFromMnemonic, decryptAES, encryptAES, generateMnemonic } from '../lib/wallet-utils/index';
// import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";
// import { PubSubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";

const nodes = {};
let node = null;

const log = (...args) => {
  // TODO: use `logger` from libp2p too
  // we want to look for our nodeId in the message and color code it
  for (let i = 0; i < args.length; i++) {
    let message = args[i];
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }

    Object.keys(nodes).forEach((nodeId) => {
      if (message.includes(nodeId)) {
        message = message.replaceAll(nodeId, colorForNode(nodeId)(nodeId));
      }
    });

    // args[i] = message;
    console.log(message);
  }
};

// start the daemon
const exec = async (context) => {
  const nodeCount = context.flags.nodes
    ? context.flags.nodes
    : context.flags.nodeId.length || 1;
  const nodeIds = context.flags.nodeId.length
    ? context.flags.nodeId
    : [...Array(nodeCount).keys()].map((i) => i.toString()); // 0...nodeCount
  if (nodeIds.length !== nodeCount) {
    throw new Error(
      `nodeIds length (${nodeIds.length}) must match nodeCount (${nodeCount})`
    );
  }
  if (!context.flags.standalone) {
    // assume this is run as a cluster, probably for dev purposes
    if (cluster.isPrimary) {
      console.log(`Primary ${process.pid} is running`);

      let bootstrappers = new Set();
      let workerCount = -1;
      const workerMap = {};

      const createWorker = (nodeId) => {
        const worker = cluster.fork();
        workerMap[`worker-${worker.id}`] = nodeId;

        worker.on("message", (msg) => {
          if (msg && msg.type) {
            switch (msg.type) {
              case "log":
                log(msg);
                break;
              case "ready":
                worker.send({
                  type: "start",
                  nodeId,
                  bootstrappers: [...bootstrappers],
                }); // send the node number to the worker
                break;
              case "new":
                // add to our list of nodes
                bootstrappers.add(...msg.addrs);

                // relay to other workers
                for (const id in cluster.workers) {
                  if (cluster.workers[id] !== worker) {
                    cluster.workers[id].send(msg);
                  }
                }

                // setup another worker if we need to
                setupWorker();
                break;
              case "dependency":
                // console.log('ignoring');
                break;
              default:
                console.log(
                  `Worker ${process.pid} received unknown message ${msg.type}`,
                  msg
                );
            }
          }
        });
      };

      const setupWorker = () => {
        workerCount++;
        if (workerCount < nodeCount) {
          createWorker(nodeIds[workerCount]);
        }
      };
      setupWorker();

      let coolDown = 2000;
      let restartsActive = new Set();
      cluster.on("exit", async (worker, code, signal) => {
        console.log(
          worker,
          `worker ${worker.process.pid} died with signal ${signal} and code ${code} ${worker.id}`
        );
        workerCount--;
        // try to restart the worker after a cool down
        coolDown = coolDown * 2;
        if (coolDown > 60000) {
          coolDown = 60000;
        }

        if (restartsActive.has(worker.id)) {
          console.log(`❌ node ${worker.id} already restarting`);
          return;
        }
        restartsActive.add(worker.id);
        setTimeout(async () => {
          restartsActive.delete(worker.id);
          const nodeId = workerMap[`worker-${worker.id}`];
          await createWorker(nodeId);
          coolDown = coolDown / 2;
          if (coolDown < 2000) {
            coolDown = 2000;
          }
        }, coolDown);

        // one node down restarts, if both are down, stop
        if (workerCount === 0) {
          console.log(`❌ no nodes active, stopping...`);
          process.exit(0);
        }
      });
      return;
    } else if (cluster.isWorker) {
      console.log(`Worker ${process.pid} started`);

      let node;
      process.on("message", async (msg) => {
        if (msg && msg.type === "start") {
          node = await createNode(context, msg.nodeId, msg.bootstrappers);
          console.log(
            `Worker ${process.pid} started node ${msg.nodeId} ${node.peerId}`
          );
          process.send({
            type: "new",
            nodeId: node.peerId,
            addrs: node.getMultiaddrs(),
          });
        } else if (msg.type === "new" && node) {
          // add to our list of nodes
          nodes[msg.nodeId] = null; // TODO: not used, convert to set?
          if (msg.nodeId !== node.peerId) {
            console.log(`Worker ${node.peerId} added node ${msg.nodeId}`);
          }
        } else {
          console.log("msg", { msg });
          console.log(
            `Worker ${process.pid} received unknown message ${msg.type}`
          );
        }
      });
      process.send({ type: "ready" });
    }
  } else {
    // standalone mode
    await createNode(context, 0, []);
  }
};
const createNode = async (context, nodeSequence, bootstrappers) => {
  let node, nodeColor, colorPrefix;
  try {
    node = await startNode(context, nodeSequence, bootstrappers);
    nodeColor = colorForNode(node.peerId);
    colorPrefix = (text) => nodeColor(`●`) + " " + text;
    // subscribe to all topics
    for (let j = 0; j < topics.length; j++) {
      log(
        colorPrefix(
          chalk.dim(`☞ Node ${nodeSequence} subscribing to ${topics[j]}`)
        )
      );
      await node.pubsub.subscribe(topics[j]);
    }
    log(
      colorPrefix(
        chalk.green(`✅ Node ${nodeSequence} started: ${node.peerId}`)
      )
    );
  } catch (err) {
    log(chalk.red(`❌ Node ${nodeSequence} failed to start: ${err}`));
    console.log(err);
    process.exit(1);
  }
  let doHeartbeat = async () => {};
  doHeartbeat = async () => {
    const heartbeat = {
      type: "♥",
      from: node.peerId.toString(),
      timestamp: parseInt((Date.now() - context.startTs) / 1000, 10),
    };
    try {
      const result = await node.pubsub.publish(
        TOPIC_HEARTBEAT,
        uint8ArrayFromString(JSON.stringify(heartbeat))
        //        encodeCbor(heartbeat)
      );

      log(
        colorPrefix(
          chalk.cyan(
            `>> published ♥ to ${TOPIC_HEARTBEAT} to ${result.recipients.length} peers`
          )
        )
      );
    } catch (err) {
      log(
        colorPrefix(
          chalk.red(`❌ failed to publish ♥ to ${TOPIC_HEARTBEAT} ${err}`)
        )
      );
    }
    if (false) {
      console.log("peer score stats debug", node.pubsub.dumpPeerScoreStats());
    }

    setTimeout(doHeartbeat, 1000);
  };
  setTimeout(doHeartbeat, 1000);

  setTimeout(() => {
    // simulate a message publish to see if it gets relayed
    const message = "Hello World";
    const topic = TOPIC_HEARTBEAT;
    const from = node.peerId.toString();
    //  const encodedMessage = encodeCbor({ from, data: message, seqno: 1 });
    const msg = JSON.stringify({ from, data: message, now: Date.now() });
    const encodedMessage = uint8ArrayFromString(msg);
    log(`☞ Sending ${msg}`);
    node.pubsub.publish(topic, encodedMessage);
  }, 2000);

  return node;
};

const getPeerId = async (context, nodeSequence) => {
  // see if it's in our config
  let peerIdConfig = context.config.get(`nodes.${nodeSequence}.peerId`);

  if (!peerIdConfig) {
    log(
      chalk.bgYellow(
        `⚠️  Node ${nodeSequence} peerId not found, creating new one`
      )
    );

    const id = await PeerIdFactory.createEd25519PeerId();
    peerIdConfig = {
      id: id.toString(),
      privKey:
        id.privateKey != null
          ? uint8ArrayToString(id.privateKey, "base64pad")
          : undefined,
      pubKey: uint8ArrayToString(id.publicKey, "base64pad"),
      type: "Ed25519",
    };

    // save it to our config
    context.config.set(`nodes.${nodeSequence}.peerId`, peerIdConfig);
  }

  const peerId = await PeerIdFactory.createFromJSON(peerIdConfig);
  return peerId;
};

const startNode = async (context, nodeSequence, bootstrappers) => {
  // add a colored prefix to the log
  const listenAddresses = context.config.get("listenAddresses") || [];
  const bindAddress = context.flags.bindAddress || "127.0.0.1";
  if (listenAddresses.length === 0) {
    log(
      chalk.dim(chalk.yellow("No listen addresses configured, using defaults"))
    );
    listenAddresses.push(`/ip4/${bindAddress}/tcp/${5050 + nodeSequence}/ws`);
  }

  // get or create our PeerId
  const peerId = await getPeerId(context, nodeSequence);
  console.log({ peerId });
  // const peerId = ourId.toString();
  const wrtcStar = webRTCStar();
  const gossipConfig = {
    emitSelf: false,
    gossipIncoming: true,
    fallbackToFloodsub: true,
    floodPublish: true,
    doPX: true, // TODO: sets trust...
    allowPublishToZeroPeers: true,
    signMessages: true, // TODO: how can we test this?
    strictSigning: true,
    // messageCache: false,
    // scoreParams: {},
    // directPeers: [],
    // allowedTopics: [ '/fruit' ]
    allowedTopics: topics,
    fanoutTTL: 60 * 1000,
    heartbeatInterval: 700,
    msgIdFn: (msg) => createHash("sha256").update(msg.data).digest(),
    msgIdToStrFn: (id) => toHex(id),
    fastMsgIdFn: (msg) => {
      const hash = createHash("sha256");
      hash.update(msg.data || new Uint8Array([]));
      return "0x" + hash.digest("hex");
    },
    // msgIdFn: (msg) => {
    //   if (msg.type !== "signed") {
    //     throw new Error("expected signed message type");
    //   }
    //   // Should never happen
    //   if (msg.sequenceNumber == null) {
    //     throw Error("missing sequenceNumber field");
    //   }

    //   // TODO: Should use .from here or key?
    //   const msgId = calcMsgId(msg.from.toBytes(), msg.sequenceNumber);
    //   // console.log({id: uint8ArrayToString(msgId,'base64'), seq: msg.sequenceNumber});
    //   // {
    //   //   id: 'ACQIARIg8axa+9Ghi9eGThbTGXIFdxoznW2C+9WKXdZUqmdyBmohoGT4IplgaQ',
    //   //   seq: 2423047616420470889n
    //   // }
    //   return msgId;
    // },
  };

  const gsub = gossipsub({ peerId });
  const nodeConfig = {
    // libp2p nodes are started by default, pass false to override this
    start: false,
    peerId,
    addresses: {
      listen: [...listenAddresses],
    },
    transports: [webSockets(), wrtcStar.transport],
    connectionEncryption: [noise()],
    peerDiscovery: [
      wrtcStar.discovery,
      // new PubSubPeerDiscovery({
      //   interval: 1000,
      // listenOnly: false
      // }),
      mdns({
        serviceTag: "diditd.local",
        interval: 5e3,
        enabled: true,
      }),
    ],
    streamMuxers: [mplex()],
    connectionManager: {
      autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minConnections)
      // The `tag` property will be searched when creating the instance of your Peer Discovery service.
      // The associated object, will be passed to the service when it is instantiated.
    },
    metrics: prometheusMetrics(),
    pubsub: gsub,
    dht: kadDHT({
      protocolPrefix: "/identagency",
    }),
    relay: {
      enabled: true, // Allows you to dial and accept relayed connections. Does not make you a relay.
      hop: {
        enabled: true, // Allows you to be a relay for other peers
      },
    },
  };

  // Known peers addresses
  // const bootstrapMultiaddrs = [
  // //   "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
  // //   "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  // ];
  const bootstrapNodes =
    (context.flags.bootstrap.length ? context.flags.bootstrap : undefined) || [
      context.config.get("bootstrap"),
    ] ||
    [];
  if (bootstrapNodes.length > 0) {
    nodeConfig.peerDiscovery.push(
      bootstrap({
        list: bootstrapNodes,
        tagName: "bootstrap",
        tagValue: 50,
        tagTTL: 120 * 1000,
      })
    );
  }
  if (bootstrappers && bootstrappers.length) {
    nodeConfig.peerDiscovery.push(
      bootstrap({
        list: bootstrappers,
        tagName: "bootstrap",
        tagValue: 50,
        tagTTL: 120 * 1000,
      })
    );
  }
  const node = await createLibp2p(nodeConfig);
  // start libp2p
  await node.start();
  nodes[node.peerId] = node;

  const nodeColor = colorForNode(node.peerId);
  const colorPrefix = (text) => nodeColor(`●`) + " " + text;
  log(colorPrefix("Starting Node " + nodeSequence));

  log(colorPrefix(chalk.green("diditd started")));

  const listenAddrs = node.getMultiaddrs();
  listenAddrs.forEach((addr) => {
    log(colorPrefix(chalk.white(`\t-\t${addr.toString()}`)));
  });

  // Listen for new peers
  node.addEventListener("peer:discovery", (evt) => {
    // dial them when we discover them
    log(
      colorPrefix(chalk.gray(`Discovered peer:\t${evt.detail.id.toString()}`))
    );

    node.dial(evt.detail.id, {}).catch((err) => {
      log(colorPrefix(chalk.redBright(`Could not dial ${evt.detail.id}`), err));
    });
  });

  // TODO: look at these approaches:
  //  https://github.com/ETL-INTERNATIONAL/js-waku/blob/493ad50d221153fd28c435096dfcb755f895f0fb/src/lib/waku_relay/index.ts
  //  https://github.com/uink45/Light-Client-Server/blob/93a9fd939a7ca90a801c4e368d043a64d3a5d26c/packages/lodestar/src/network/gossip/gossipsub.ts

  // setup stream handler
  node.handle(`/ident.agency/1.0.0`, () => {
    log(colorPrefix(chalk.red(`received stream!`)));
    // https://github.com/canvasxyz/canvas/blob/6494f48ef2d4516a62389d70a3f1b7222e9ad351/packages/core/src/rpc/server.ts#L23
    // https://github.com/ChainSafe/js-libp2p-gossipsub/blob/ad1e6cee2df68141a263ff16c64240a89961b9ab/src/index.ts#L912
  });

  // setup pubsub
  // node.pubsub.addEventListener("message", (msg) => {
  //   log('msg');
  // });
  node.pubsub.addEventListener("message", async ({ detail: message }) => {
    if (message.type !== "signed") {
      log(colorPrefix(chalk.red(`message ${message.id} not signed`)));
      return;
    }
    // console.log({message});
    try {
      //      const decoded = decodeCbor(msg.detail.data);
      const decoded = uint8ArrayToString(message.data);
      log(
        colorPrefix(
          chalk.dim(
            // `pubsub message [${msg.detail.topic}]: ${uint8ArrayToString(
            //   msg.detail.data
            // )}`
            `<< received pubsub message [${message.topic}]: `
          )
        ) + decoded
      );
    } catch (err) {
      log(colorPrefix(chalk.red(`decode err: ${err}`)));
    }
  });

  const validateTopic = (peerTopic, msg) => {
    // should return quickly, under 100ms or penalty is applied

    const topic = msg.topic;

    // valid topics start a set of prefix regular expressions
    // may want a stronger membrane in the future, we have access to whole msg.
    const validTopics = [
      new RegExp(`^\/${IA_VERSION}\/.*`),
      /^\/kudos.*/,
      // tktkt
    ];

    // check to see if the topic is valid
    const isValid = validTopics.some((regex) => regex.test(topic));
    if (!isValid) {
      log(colorPrefix(chalk.red(`topic: ${topic} is not valid`)));
      throw new Error(`topic: ${topic} is not valid`);
    }

    // more useful to check the message data itself
    // const decoded = decodeCbor(msg.data);
    // log(colorPrefix(chalk.dim(`pubsub message [${msg.topic}]: `)), decoded);
    // msg.data -> schema check?
    return isValid ? "accept" : "reject";
  };
  node.pubsub.topicValidators.set(TOPIC_HEARTBEAT, validateTopic);

  // setup event listeners
  // node.addEventListener("peer:discovery", (evt) => {
  //   log(
  //     colorPrefix(chalk.yellow(`Discovered peer:\t${evt.detail.id.toString()}`))
  //   ); // Log discovered peer
  // });

  node.connectionManager.addEventListener("peer:disconnect", async (evt) => {
    const connection = evt.detail;
    const connectionId = connection.remotePeer.toString();
    log(colorPrefix(`Disconnected from ${connectionId}`));
    setTimeout(() => {
      log(chalk.dim(`cleaned up ${connectionId}`));
      delete nodes[connectionId];
    }, 10);
  });

  node.connectionManager.addEventListener("peer:connect", async (evt) => {
    const connection = evt.detail;
    const connectionId = connection.remotePeer.toString();
    nodes[connectionId] = connection;
    log(colorPrefix(chalk.cyan(`Connected to peer:\t${connectionId} `)), evt); // Log connected peer
  });

  return node;
};

export { exec };
