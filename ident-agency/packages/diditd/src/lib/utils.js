import assert from "node:assert";
import chalk from "chalk";
import stringHash from "string-hash";

export const toBuffer = (array) =>
  Buffer.from(array.buffer, array.byteOffset, array.byteLength);

export function toHex(hash) {
  if (!Buffer.isBuffer(hash)) {
    hash = toBuffer(hash);
  }

  return `0x${hash.toString("hex")}`;
}

export function fromHex(input) {
  assert(input.startsWith("0x"), 'input did not start with "0x"');
  return Buffer.from(input.slice(2), "hex");
}

export const colorForNode = (nodeId) => {
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
