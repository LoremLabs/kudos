import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex as toHex } from "@noble/hashes/utils";
import { Resolver } from "dns/promises";

const resolver = new Resolver();

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

// lookup a subject, get their payment address via dns
export const getSubjectPayVia = async ({
  subject,
  network,
  domain = "ident.cash",
}) => {
  const subdomain = await getSubjectSubdomain(subject);
  const host = `${network.replace(":", "-")}.${subdomain}.${domain}`;

  let txtRecord;

  try {
    const response = await resolver.resolve(host, "TXT");
    txtRecord = response[0][0];
    console.log({ txtRecord });
    if (txtRecord) {
      // remove any outer quotes
      txtRecord = txtRecord.replace(/^"(.*)"$/, "$1");
    }
  } catch (e) {
    if (e.message && !e.message.includes("ENODATA")) {
      console.log(e);
    }
  }

  if (txtRecord) {
    // TODO: support escrow type responses
    return { payVia: txtRecord };
  }
  return {};
};
