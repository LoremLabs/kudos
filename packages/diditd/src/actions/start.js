import chalk from "chalk";
import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";

import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { webRTCStar } from "@libp2p/webrtc-star";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";
import { bootstrap } from "@libp2p/bootstrap";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

const log = console.log;

// start the daemon
const exec = async (context) => {
  const nodeCount = context.flags.nodes || 1;

  const nodes = [];

  // start up the nodes
  for (let i = 0; i < nodeCount; i++) {
    try {
      nodes[i] = await startNode(context, i);
      log(chalk.green(`✅ Node ${i + 1}/${nodeCount} started.`));
    } catch (err) {
      log(chalk.red(`❌ Node ${i} failed to start: ${err}`));
      process.exit(1);
    }
  }

  // connect nodes to their previous peer
  for (let i = 0; i < nodeCount; i++) {
    try {
      let nextNode = (i + 1) % nodeCount;
      await nodes[i].peerStore.addressBook.set(
        nodes[nextNode].peerId,
        nodes[nextNode].getMultiaddrs()
      );
      await nodes[i].dial(nodes[nextNode].peerId);

      log(chalk.dim(`☞ ${i} -> ${nextNode} connected.`));
    } catch (err) {
      log(chalk.red(`❌ Node ${i} failed to connect: ${err}`));
    }
  }
};

const startNode = async (context, nodeSequence) => {
  // each node has its own color log(colorPrefix("Node " + nodeSequence)))
  const colors = [
    chalk.cyan,
    chalk.white,
    chalk.greenBright,
    chalk.gray,
    chalk.blue,
    chalk.yellow,
    chalk.magenta,
    chalk.red,
  ];
  const nodeColor = colors[nodeSequence % colors.length];
  // add a colored prefix to the log
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
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
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
      colorPrefix(chalk.gray(`Discovered peer:\t%s`), evt.detail.id.toString())
    );

    node.dial(evt.detail.id).catch((err) => {
      log(colorPrefix(chalk.orange(`Could not dial ${evt.detail.id}`), err));
    });
  });

  // setup pubsub
  node.pubsub.addEventListener("message", (msg) => {
    try {
      const decoded = decodeCbor(msg.detail.data);
      log(
        colorPrefix(
          chalk.dim(
            // `pubsub message [${msg.detail.topic}]: ${uint8ArrayToString(
            //   msg.detail.data
            // )}`
            `pubsub message [${msg.detail.topic}]: `
          )
        ),
        decoded
      );
    } catch (err) {
      log(colorPrefix(chalk.red(`decode err: ${err}`)));
    }
  });
  await node.pubsub.subscribe("did.heartbeat");

  const validateTopic = (msgTopic, msg) => {
    const topic = uint8ArrayToString(msg.data);

    // valid topics start a set of prefix regular expressions
    const validTopics = [
      /^did\/.*/,
      /^kudos\/.*/,
      // tktkt
    ];

    // check to see if the topic is valid
    const isValid = validTopics.some((regex) => regex.test(topic));
    if (!isValid) {
      throw new Error(`topic: ${topic} is not valid`);
    }
  };
  node.pubsub.topicValidators.set("all", validateTopic);

  // setup event listeners
  node.addEventListener("peer:discovery", (evt) => {
    log(
      colorPrefix(
        chalk.yellow("Discovered peer:\t%s"),
        evt.detail.id.toString()
      )
    ); // Log discovered peer
  });

  node.connectionManager.addEventListener("peer:connect", async (evt) => {
    log(colorPrefix(chalk.cyan("Connected to peer:\t%s"), JSON.stringify(evt))); // Log connected peer

    // send a heartbeat every second
    let doHeartbeat = async () => {};
    doHeartbeat = async () => {
      const heartbeat = {
        type: "heartbeat",
        peerId: node.peerId.toString(),
        timestamp: Date.now(),
      };
      const heartbeatTopic = "did.heartbeat";
      await node.pubsub.publish(
        heartbeatTopic,
        //        new TextEncoder().encode(JSON.stringify(heartbeat))
        encodeCbor(heartbeat)
      );

      log(colorPrefix(chalk.cyan(`published heartbeat to ${heartbeatTopic}`)));
      setTimeout(doHeartbeat, 1000);
    };
    setTimeout(doHeartbeat, 1000);
  });

  return node;
};

export { exec };
