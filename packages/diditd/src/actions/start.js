import chalk from "chalk";

import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { webRTCStar } from "@libp2p/webrtc-star";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";

import { bootstrap } from "@libp2p/bootstrap";

const log = console.log;

// start the daemon
const exec = async (context) => {
  const listenAddresses = context.config.get("listenAddresses") || [];

  if (listenAddresses.length === 0) {
    log(
      chalk.yellow(
        "No listen addresses configured, using default:\t/ip4/127.0.0.1/tcp/5051/ws"
      )
    );
    listenAddresses.push(`/ip4/127.0.0.1/tcp/5051/ws`);
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
  log(chalk.green("diditd started"));

  const listenAddrs = node.getMultiaddrs();
  listenAddrs.forEach((addr) => {
    log(chalk.white(`\t-\t${addr.toString()}`));
  });

  // Listen for new peers
  node.addEventListener("peer:discovery", (evt) => {
    // dial them when we discover them
    log(chalk.gray(`Discovered peer:\t%s`), evt.detail.id.toString());

    libP2p.dial(evt.detail.id).catch((err) => {
      log(chalk.orange(`Could not dial ${evt.detail.id}`), err);
    });
  });

  // setup pubsub
  node.pubsub.addEventListener("message", (msg) => {
    log(
      chalk.cyan(
        `pubsub message [${msg.detail.topic}]: ${uint8ArrayToString(msg.data)}`
      )
    );
  });
  await node.pubsub.subscribe("all");

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
    log(chalk.yellow("Discovered peer:\t%s"), evt.detail.id.toString()); // Log discovered peer
  });

  node.connectionManager.addEventListener("peer:connect", async (evt) => {
    log(chalk.green("Connected to peer:\t%s"), evt.peerId.toString()); // Log connected peer
    await node.stop();
    log(chalk.red("diditd stopped"));
    process.exit(0);
  });
};

export { exec };
