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

      // input[2] could be {set}, in which case we should set the mnemonic
      if (context.input[2] === "set") {
        // ask for the mnemonic
        const response = await prompts([
          {
            type: "text",
            name: "mnemonic",
            message: `Enter your mnemonic phrase in one line, separated by spaces: `,
            initial: false,
          },
          // confirm are you sure
          {
            type: "confirm",
            name: "ok",
            message: `Are you sure you want to set this mnemonic?`,
            initial: false,
          },
        ]);
        if (!response.mnemonic || !response.ok) {
          process.exit(1);
        }
        await context.vault.write("mnemonic", response.mnemonic);
      } else {
        // get the mnemonic
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
      }
      break;
    default:
      if (
        !context.input[1] ||
        context.flags.help ||
        context.input[1] === "help"
      ) {
        // give help with available subcommands and flags
        log("Usage: setler wallet [command] [options]");
        log("");
        log("Commands:");
        log("  init");
        log("  keys");
        log("  mnemonic {get,set}");
        log("");
        log("Options:");
        log(
          "  --profile <profile> - default: 0, 1, 2, ... Same mnemonic, different keys"
        );
        log(
          "  --scope <scope> - default: 0, 1, 2, ... Different mnemonic, different keys"
        );
        log("  --passPhrase <passPhrase> - default: ''");
        log("  --yes - default: false");
        log("");
        log("Examples:");
        log("  setler wallet init --profile 0 --scope 5");
        log("  setler wallet keys --profile 1 --scope 5");
        log("  setler wallet mnemonic --yes --scope 0");
        log("  setler wallet mnemonic set --scope 1");
        log("");

        process.exit(1);
      }

      log(chalk.red(`Unknown command: ${context.input[1]}`));
      process.exit(1);
  }
};

export { exec };
