import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";

import { bootstrap } from "@libp2p/bootstrap";
import chalk from "chalk";
import { createLibp2p } from "libp2p";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";
import { logger } from "@libp2p/logger";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { webRTCStar } from "@libp2p/webrtc-star";
import { webSockets } from "@libp2p/websockets";

const nodes = [];
const heartbeatTopic = "/did";
const topics = [heartbeatTopic];

const log = (...args) => {
  // we want to look for our nodeId in the message and color code it
  for (let i = 0; i < args.length; i++) {
    let message = args[i];
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    for (let j = 0; j < nodes.length; j++) {
      const nodeId = nodes[j].peerId.toString();
      if (message.includes(nodeId)) {
        message = message.replaceAll(nodeId, colorForNode(j)(nodeId));
      }
    }
    // args[i] = message;
    console.log(message);
  }
};

// start the daemon
const exec = async (context) => {
  const nodeCount = context.flags.nodes || 1;

  // start up the nodes
  for (let i = 0; i < nodeCount; i++) {
    try {
      nodes[i] = await startNode(context, i);
    
      // subscribe to all topics
      for (let j = 0; j < topics.length; j++) {
        log(chalk.dim(`☞ Node ${i + 1} subscribing to ${topics[j]}`));
        await nodes[i].pubsub.subscribe(topics[j]);
      }
      log(
        chalk.green(`✅ Node ${i + 1}/${nodeCount} started: ${nodes[i].peerId}`)
      );
    } catch (err) {
      log(chalk.red(`❌ Node ${i} failed to start: ${err}`));
      process.exit(1);
    }
  }

  // connect nodes to their previous peer
  // for (let i = 0; i < nodeCount; i++) {
  //   try {
  //     let nextNode = (i + 1) % nodeCount;
  //     await nodes[i].peerStore.addressBook.set(
  //       nodes[nextNode].peerId,
  //       nodes[nextNode].getMultiaddrs()
  //     );
  //     // only dial if it's not ourself
  //     if (nodes[i].id !== nodes[nextNode].id) {
  //       await nodes[i].dial(nodes[nextNode].peerId);
  //       log(chalk.dim(`☞ ${i} -> ${nextNode} connected.`));
  //     } else {
  //       log(chalk.dim(`☞ ${i} -> ${nextNode} skipped.`));
  //     }
  //   } catch (err) {
  //     log(chalk.red(`❌ Node ${i} failed to connect: ${err}`));
  //   }
  // }

  setTimeout(() => {
    // simulate a message publish to see if it gets relayed
    const message = "Hello World";
    const topic = heartbeatTopic;
    const from = nodes[0].peerId.toString();
    //  const encodedMessage = encodeCbor({ from, data: message, seqno: 1 });
    const encodedMessage = uint8ArrayFromString(
      JSON.stringify({ from, data: message, seqno: 1, now: Date.now() })
    );
    log(`☞ Sending message to ${nodes[1].peerId.toString()}`);
    nodes[0].pubsub.publish(topic, encodedMessage);
  }, 2000);

    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      // send a ♥ every second
      let doHeartbeat = async () => {};
      doHeartbeat = async () => {
        const heartbeat = {
          type: "♥",
          // peerId: node.peerId.toString(),
          // timestamp: Date.now(),
        };
        await node.pubsub.publish(
          heartbeatTopic,
          uint8ArrayFromString(JSON.stringify({msg:"♥", from:node.peerId.toString()}))
          //        encodeCbor(heartbeat)
        );
  
        const nodeColor = colorForNode(i);
        const colorPrefix = (text) => nodeColor(`●`) + " " + text;
      
        log(colorPrefix(chalk.cyan(`published ♥ to ${heartbeatTopic}`)));
        setTimeout(doHeartbeat, 1000);
      };
      setTimeout(doHeartbeat, 1000);
    }
};

const colorForNode = (nodeSequence) => {
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
  const nodeColor = colors[nodeSequence % colors.length];
  return nodeColor;
};

const startNode = async (context, nodeSequence) => {
  // add a colored prefix to the log
  const nodeColor = colorForNode(nodeSequence);
  const colorPrefix = (text) => nodeColor(`●`) + " " + text;
  log(colorPrefix("Starting Node " + nodeSequence));

  const listenAddresses = context.config.get("listenAddresses") || [];
  const bindAddress = context.flags.bindAddress || "127.0.0.1";
  if (listenAddresses.length === 0) {
    log(
      colorPrefix(
        chalk.yellow("No listen addresses configured, using defaults")
      )
    );
    listenAddresses.push(`/ip4/${bindAddress}/tcp/${5050 + nodeSequence}/ws`);
  }

  const wrtcStar = webRTCStar();

  const gossipConfig = {
    emitSelf: false,
    gossipIncoming: true,
    fallbackToFloodsub: true,
    floodPublish: true,
    // doPX: true,
    allowPublishToZeroPeers: true,
    // signMessages: true, // TODO: how can we test this?
    // strictSigning: true,
    messageCache: false,
    // scoreParams: {},
    // directPeers: [],
    // allowedTopics: [ '/fruit' ]
    allowedTopics: topics,
    fanoutTTL: 60 * 1000,
    heartbeatInterval: 700,
  } ;

  const nodeConfig = {
    // libp2p nodes are started by default, pass false to override this
    start: false,
    addresses: {
      listen: [...listenAddresses],
    },
    transports: [webSockets(), wrtcStar.transport],
    connectionEncryption: [noise()],
    peerDiscovery: [wrtcStar.discovery],
    streamMuxers: [mplex()],
    connectionManager: {
      autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minConnections)
      // The `tag` property will be searched when creating the instance of your Peer Discovery service.
      // The associated object, will be passed to the service when it is instantiated.
    },
    pubsub: gossipsub(gossipConfig),
    dht: kadDHT(),
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

  const node = await createLibp2p(nodeConfig);
  // start libp2p
  await node.start();
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

    node.dial(evt.detail.id).catch((err) => {
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
            `received pubsub message [${msg.detail.topic}]: `
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
      /^did\..*/,
      /^kudos\..*/,
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
  };
  node.pubsub.topicValidators.set(heartbeatTopic, validateTopic);

  // setup event listeners
  node.addEventListener("peer:discovery", (evt) => {
    log(
      colorPrefix(chalk.yellow(`Discovered peer:\t${evt.detail.id.toString()}`))
    ); // Log discovered peer
  });

  node.connectionManager.addEventListener("peer:disconnect", async (evt) => {
    const connection = evt.detail;
    log(colorPrefix(`Disconnected from ${connection.remotePeer}`));
  });
 
  node.connectionManager.addEventListener("peer:connect", async (evt) => {
    log(
      colorPrefix(
        chalk.cyan(`Connected to peer:\t${evt?.detail?.remotePeer} `)
      ),
      evt
    ); // Log connected peer
  });

  return node;
};

export { exec };
