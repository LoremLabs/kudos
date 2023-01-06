import assert from "node:assert";

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
