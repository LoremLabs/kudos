import chalk from "chalk";
import { deriveKeys } from "../lib/wallet/keys.js";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";

const log = console.log;

const getKeys = async (context) => {
  let keys = await deriveKeys({
    mnemonic: context.mnemonic,
    passPhrase: context.passPhrase,
    id: context.profile,
  });
  return keys;
};

const exec = async (context) => {
  // switch based on the subcommand
  switch (context.input[1]) {
    case "init":
      await gatekeep(context, true);
      break;
    case "keys":
      await gatekeep(context);

      context.keys = await getKeys(context);
      log(`keys: ${JSON.stringify(context.keys, null, "  ")}`);
      break;
    case "mnemonic":
      await gatekeep(context);

      if (!context.flags.yes) {
        // ask if we should print the mnemonic
        const response = await prompts([
          {
            type: "confirm",
            name: "ok",
            message: `Would you like to disclose your mnemonic phrase?`,
            initial: false,
          },
        ]);
        if (!response.ok) {
          process.exit(1);
        }
      }
      log(chalk.bold(context.mnemonic));
      break;
    default:
      if (!context.input[1]) {
        // give help with available subcommands and flags
        log("Usage: setler wallet [command] [options]");
        log("");
        log("Commands:");
        log("  init");
        log("  keys");
        log("  mnemonic");
        log("");
        log("Options:");
        log("  --yes");
        log("  --profile, -p");

        process.exit(1);
      }

      log(chalk.red(`Unknown command: ${context.input[1]}`));
      process.exit(1);
  }
};

export { exec };
