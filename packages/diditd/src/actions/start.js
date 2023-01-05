import * as PeerIdFactory from "@libp2p/peer-id-factory";

import { bootstrap } from "@libp2p/bootstrap";
import { msgId as calcMsgId } from "@libp2p/pubsub/utils";
import chalk from "chalk";
import cluster from "node:cluster";
import { createLibp2p } from "libp2p";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";
// import { logger } from "@libp2p/logger";
import { mdns } from "@libp2p/mdns";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import process from "node:process";
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
const heartbeatTopic = "/didit/heartbeat/1.0.0";
const topics = [heartbeatTopic];

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
  const nodeCount = context.flags.nodes || 1;

  if (nodeCount > 1) {
    // assume this is run as a cluster, probably for dev purposes
    if (cluster.isPrimary) {
      console.log(`Primary ${process.pid} is running`);

      let bootstrappers = new Set();
      let workerCount = -1;

      const setupWorker = () => {
        workerCount++;
        if (workerCount < nodeCount) {
          const worker = cluster.fork();

          worker.on("message", (msg) => {
            if (msg && msg.type) {
              switch (msg.type) {
                case "log":
                  log(msg);
                  break;
                case "ready":
                  worker.send({
                    type: "start",
                    nodeId: workerCount,
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
                default:
                  console.log(
                    `Worker ${process.pid} received unknown message ${msg.type}`,
                    msg
                  );
              }
            }
          });
        }
      };
      setupWorker();

      cluster.on("exit", (worker, code, signal) => {
        console.log(
          `worker ${worker.process.pid} died with signal ${signal} and code ${code}`
        );
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
    process.exit(1);
  }
  let doHeartbeat = async () => {};
  doHeartbeat = async () => {
    const heartbeat = {
      type: "♥",
      // peerId: node.peerId.toString(),
      // timestamp: Date.now(),
    };
    const result = await node.pubsub.publish(
      heartbeatTopic,
      uint8ArrayFromString(
        JSON.stringify({ msg: "♥", from: node.peerId.toString() })
      )
      //        encodeCbor(heartbeat)
    );

    log(
      colorPrefix(
        chalk.cyan(
          `>> published ♥ to ${heartbeatTopic} to ${result.recipients.join(
            ","
          )} peers`
        )
      )
    );
    if (false) {
      console.log("peer score stats debug", node.pubsub.dumpPeerScoreStats());
    }

    setTimeout(doHeartbeat, 1000);
  };
  setTimeout(doHeartbeat, 1000);

  setTimeout(() => {
    // simulate a message publish to see if it gets relayed
    const message = "Hello World";
    const topic = heartbeatTopic;
    const from = node.peerId.toString();
    //  const encodedMessage = encodeCbor({ from, data: message, seqno: 1 });
    const msg = JSON.stringify({ from, data: message, now: Date.now() });
    const encodedMessage = uint8ArrayFromString(msg);
    log(`☞ Sending ${msg}`);
    node.pubsub.publish(topic, encodedMessage);
  }, 2000);

  return node;
};

const colorForNode = (nodeId) => {
  // each node has its own color log(colorPrefix("Node " + nodeSequence)))
  const colors = [
    chalk.cyan,
    chalk.greenBright,
    chalk.white,
    chalk.gray,
    chalk.blue,
    chalk.yellow,
    chalk.magenta,
    chalk.red,
  ];
  const nodeColor = colors[stringHash(nodeId + "") % colors.length]; // gives a consistent color based on id, but given the color space is low may be sometimes confusing.

  return nodeColor;
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
    msgIdFn: (msg) => {
      if (msg.type !== "signed") {
        throw new Error("expected signed message type");
      }
      // Should never happen
      if (msg.sequenceNumber == null) {
        throw Error("missing sequenceNumber field");
      }

      // TODO: Should use .from here or key?
      const msgId = calcMsgId(msg.from.toBytes(), msg.sequenceNumber);
      // console.log({id: uint8ArrayToString(msgId,'base64'), seq: msg.sequenceNumber});
      // {
      //   id: 'ACQIARIg8axa+9Ghi9eGThbTGXIFdxoznW2C+9WKXdZUqmdyBmohoGT4IplgaQ',
      //   seq: 2423047616420470889n
      // }
      return msgId;
    },
  };
  const gsub = gossipsub(gossipConfig);
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
    pubsub: gsub,
    dht: kadDHT(),
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
    (context.flags.bootstrap
      ? context.flags.bootstrap.split(",")
      : undefined) ||
    context.config.get("bootstrap") ||
    [];
  if (bootstrapNodes.length > 0) {
    nodeConfig.peerDiscovery.push(bootstrap({ list: bootstrapNodes }));
  }
  if (bootstrappers && bootstrappers.length) {
    console.log("bootstrappers", bootstrappers);
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

    node.dial(evt.detail.id, { tag: "abc" }).catch((err) => {
      log(colorPrefix(chalk.redBright(`Could not dial ${evt.detail.id}`), err));
    });
  });

  // setup pubsub
  // node.pubsub.addEventListener("message", (msg) => {
  //   log('msg');
  // });
  node.pubsub.addEventListener("message", async (msg) => {
    try {
      //      const decoded = decodeCbor(msg.detail.data);
      const decoded = uint8ArrayToString(msg.detail.data);
      log(
        colorPrefix(
          chalk.dim(
            // `pubsub message [${msg.detail.topic}]: ${uint8ArrayToString(
            //   msg.detail.data
            // )}`
            `<< received pubsub message [${msg.detail.topic}]: `
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
      /^\/did.*/,
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
  node.pubsub.topicValidators.set(heartbeatTopic, validateTopic);

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
