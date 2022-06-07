import chalk from "chalk";
import xrpl from "xrpl";

// import { identToPaymentAddress } from "../lib/ident.js";
import { currentCohort } from "../lib/date.js";

const log = console.log;
// const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const exec = async (context) => {
  const flags = context.flags;

  if (context.input[1] === "cohort") {
    // we have a cohort
    if (!flags.cohort) {
      log(
        chalk.red(
          `No --cohort specified (current cohort is ${currentCohort()})`
        )
      );
      process.exit(2);
    }
    // see if flags.cohort is the current cohort, do not allow unless allowCurrent
    if (flags.cohort == `${currentCohort()}` && !flags.allowCurrent) {
      log(chalk.red("Cannot use current cohort without --allowCurrent"));
      process.exit(2);
    }

    // read from stdin, process
    if (context.stdin.length <= 0) {
      log(chalk.red("No input provided. Try: kudos ledger | kudos settle"));
      process.exit(2);
    }
    const accounts = JSON.parse(context.stdin);
    // connect to xrpl
    const seed = flags.seed || process.env.KUDOS_SENDER_SECRET || context.config.get("xrpl.secret") || ""; // TODO: set via config/init
    if (!seed) {
      log(chalk.red(`No seed provided. Try: cat seedFile.txt | kudos config set xrpl.secret`));
      process.exit(2);
    }
    const wallet = xrpl.Wallet.fromSeed(seed);
    const xrplClient = new xrpl.Client(
      process.env.XRPL_ENDPOINT || context.config.get("xrpl.endpoint") || "wss://s.altnet.rippletest.net:51233"
    );
    await xrplClient.connect();

    for (const account of Object.keys(accounts)) {
      if (account.startsWith("xrpl://")) {
        // xrpl account
        const paymentAddress = account.substring(7);
        if (paymentAddress == wallet.address) {
          log(chalk.cyan(`Skipping[${paymentAddress}]: Cannot settle own account`));
          continue;
        }
        log(chalk.green(paymentAddress));
        const amount = accounts[account] * flags.amount; // TODO: bigmath 1,000,000 drops equals 1 XRP.
        const tx = {
          TransactionType: "Payment",
          Account: wallet.address,
          Amount: xrpl.xrpToDrops(`${amount.toFixed(6)}`),
          Destination: paymentAddress,
        };
        const prepared = await xrplClient.autofill(tx);
        const signed = wallet.sign(prepared);
        log("Identifying hash:", signed.hash);
        log("Signed blob:", signed.tx_blob);
        if (flags.yes) {
          const results = await xrplClient.submitAndWait(signed.tx_blob);
          log("Results:", results);
        } else {
          log(chalk.yellow("Dry run. Repeat this command with the --yes flag to send."));
        }
      }
    }
    xrplClient.disconnect();
  } else {
    log(
      "Usage: kudos settle [cohort] [--cohort=202213] [--amount=10] [--yes] [--allowCurrent] [--seed=SECRET]"
    );
    process.exit(1);
  }
};

export { exec };
