import chalk from "chalk";
import { getCohort, resetCohort } from "../lib/kudos.js";
import { identToPaymentAddress } from "../lib/ident.js";
import { currentCohort } from "../lib/date.js";
import fs from "fs";

const log = console.log;

const exec = async (context) => {
  const flags = context.flags;
  flags.cohort = flags.cohort || currentCohort(flags.timestamp);

  if (flags.help) {
    log(
      `Usage:
      $ kudos ledger [reset|weighted|summary] [--cohort=current] [--outFile=STDOUT] [--timestamp=now] [--quiet=false] [--escrow=escrow] [--settle=100]
        `
    );
    process.exit(1);
  }

  // get the ledger for a given cohort
  const ledger = await getCohort(flags);
  if (context.input[1] === "summary") {
    // summary data
    if (flags.outFile) {
      fs.writeFileSync(flags.outFile, JSON.stringify(ledger, null, 2));
    } else {
      if (!flags.quiet) {
        log(chalk.green(`Local Kudos Ledger for Cohort: ${flags.cohort}\n`));
      }
      log(JSON.stringify(ledger, null, 2));
    }
  } else if (context.input[1] === "reset") {
    if (context.flags.yes) {
      resetCohort(flags);
    } else {
      log(chalk.red("Reset ledger? This clears all entries for this cohort."));
      log("\nIf you are sure, repeat this command with the --yes flag.");
      process.exit(2);
    }
  } else {
    // get the weighted ledger
    // ledger is array of kudos, with kudo.weight, identified by kudo.identifier
    let totalWeight = 0;
    let weightedLedger = {};
    for (const kudo of ledger) {
      let identifier = kudo.identifier;
      kudo.account = await identToPaymentAddress(identifier);
      if (kudo.account) {
        identifier = `${kudo.account}`;
      } else {
        identifier = flags.escrow || process.env.KUDOS_ESCROW || `escrow://tbd`;
      }

      weightedLedger[identifier] =
        parseFloat(kudo.cohortWeight) + (weightedLedger[identifier] || 0);
      totalWeight += parseFloat(kudo.cohortWeight);
    }

    // add percentage of totalWeight to weightedLedger
    for (const identifier of Object.keys(weightedLedger)) {
      if (flags.settle) {
        weightedLedger[identifier] =
          parseFloat(flags.settle) * (weightedLedger[identifier] / totalWeight);
      } else {
        weightedLedger[identifier] = weightedLedger[identifier] / totalWeight;
      }
    }
    log(chalk.green(JSON.stringify(weightedLedger, null, 2)));
  }
};

export { exec };
