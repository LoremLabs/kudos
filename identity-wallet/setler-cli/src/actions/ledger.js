import chalk from "chalk";
// import fetch from "node-fetch";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import jsonColorize from "json-colorizer";
import prompts from "prompts";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";

const log = console.log;

export const help = () => {
  // give help with available subcommands and flags
  log("Usage: setler ledger [command] [options]");
  log("");
  log("Sub commands:");
  log("  tx");
  log("");
  log("Examples:");
  log(
    "  setler ledger tx 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --network xrpl:testnet"
  );
  log("");

  process.exit(1);
};

const exec = async (context) => {
  switch (context.input[1]) {
    case "tx": {
      await gatekeep(context);

      const network =
        context.flags.network || context.config.network || "xrpl:testnet";

      let txHash = context.input[2];
      if (!txHash) {
        // ask user for transaction hash
        const response = await prompts({
          type: "text",
          name: "txHash",
          message: "Transaction hash:",
        });
        txHash = response.txHash;

        if (!txHash) {
          log(chalk.red(`Please provide a transaction hash`));
          process.exit(1);
        }
      }

      const txPromise = context.coins.getTransaction({ txHash, network });

      let tx;

      try {
        if (!context.flags.quiet) {
          tx = await waitFor(txPromise, {
            text: `Fetching transaction ` + chalk.cyan(`${txHash}`),
          });
        } else {
          tx = await txPromise;
        }
      } catch (e) {
        // log(chalk.red(`Error fetching transaction: ${e.message}`));
        // process.exit(1);
      }

      if (!tx) {
        log("");
        log(chalk.red(`Transaction not found`));
        process.exit(1);
      }

      if (!context.flags.quiet) {
        log("");
        const { width } = windowSize.get();
        log(" " + "─".repeat(width - 2));
        log(chalk.green(`  Hash: ${txHash}`));
        log(chalk.green(`  Network: ${network}`));
        log(" " + "─".repeat(width - 2));
        log("");
      }

      if (!context.flags.jsonSimple) {
        log(jsonColorize(tx, { pretty: true }));
      } else {
        log(JSON.stringify(tx, null, 2));
      }
      // disconnect
      await context.coins.disconnect();

      break;
    }
    case "help": {
      help();
      break;
    }
    default: {
      if (context.flags.help) {
        help();
        break;
      }
      log(chalk.red(`Unknown command: ${context.input[1]}`));
      break;
    }
  }
};

export { exec };
