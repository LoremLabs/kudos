// import chalk from "chalk";
import { getCohortEntries } from "../lib/kudos.js";
import { currentCohort } from "../lib/date.js";
import fs from "fs";
import * as objectSha from "object-sha";

const log = console.log;

const exec = async (context) => {
  const flags = context.flags;
  flags.cohort = flags.cohort || currentCohort(flags.timestamp);

  if (flags.help) {
    log(
      `Usage:
      $ ${context.personality} list [--cohort=current] [--outFile=STDOUT] [--timestamp=now] [--quiet=false]
        `
    );
    process.exit(0);
  }

  const dbDir = flags.dbDir
    ? flags.dbDir
    : context.config.get(`${context.personality}.dbDir`);

  // list the entries for a given cohort
  const entries = await getCohortEntries({ ...flags, dbDir });
  const sha256 = await objectSha.digest(entries, "SHA-256");
  const outData = JSON.stringify({ context: flags, entries, sha256 }, null, 1);

  if (flags.outFile) {
    fs.writeFileSync(flags.outFile, outData);
  } else {
    log(outData);
  }
  process.exit(0);
};

export { exec };
