#!/usr/bin/env node

import { getSubjectHash } from "./index.js";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length === 0) {
  console.error("Usage: subject-hash <subject> [--hex|--bigint]");
  process.exit(1);
}

const subject = positional[0];

if (flags.includes("--hex")) {
  console.log(getSubjectHash(subject, "hex"));
} else if (flags.includes("--bigint")) {
  console.log(String(getSubjectHash(subject, "bigint")));
} else {
  console.log(getSubjectHash(subject, "base64url"));
}
