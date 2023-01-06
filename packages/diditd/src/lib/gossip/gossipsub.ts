import { GossipSub, GossipsubOptions } from "@chainsafe/libp2p-gossipsub";
import { colorForNode, toHex } from "../utils.js";

import { createHash } from "node:crypto";
import { topics } from "./topics.js";

export class IdentGossipsub extends GossipSub {
  constructor(opts: GossipsubOptions, modules: any) {
    const gossipConfig = {
      peerId: modules.peerId,
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
    // const c = { ...gossipConfig, ...opts };
    // console.log({c});
    // opts.peerId = opts.peerId || modules.peerId;
    super(opts, { ...gossipConfig, ...modules });
  }

  public start(): void {
    super.start();
    this.debugLogger("IdentGossipsub started");
  }

  // overwrite console.log with colorizer
  public debugLogger = (...args) => {
    const myId = this.components?.peerId?.toString();
    const nodeColor = colorForNode(myId || "unknown");
    console.log(nodeColor(`●`), ...args);
  };
}
