import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex as toHex } from "@noble/hashes/utils";

export const getSubjectSubdomain = async (subj) => {
  // calculate the sha256 of the subject
  const subject = subj.toLowerCase().trim();

  // subject would be email:someone@example.com or whatever identifier you want, with a type prefix

  const subjectHash = toHex(sha256(subject)); // 64 bytes, need to split in two for dns. one other thing to note: we can't have all numbers, so if that's the case we will add a prefix

  // split subjectHash in two equal parts
  let part1 = subjectHash.substring(0, 32);
  let part2 = subjectHash.substring(32);

  // check if part1 is all numbers
  if (/^\d+$/.test(part1)) {
    // add a prefix
    part1 = "sha256-" + part1; // prefix should be ignored by the resolver
  }

  // check if part2 is all numbers
  if (/^\d+$/.test(part2)) {
    // add a prefix
    part2 = "sha256-" + part2;
  }
  const subjHash = `${part1}.${part2}`;
  return subjHash;
};
