import { createLibp2p as create } from "libp2p";
import defaultsDeep from "@nodeutils/defaults-deep";

export async function createLibp2p(_options) {
  const defaults = {};

  const libp2p = create(defaultsDeep(_options, defaults));
  //   (await libp2p).addEventListener("peer:discovery", (peerId) => {
  //     console.log("Discovered:", peerId);
  //   });

  return libp2p;
}
