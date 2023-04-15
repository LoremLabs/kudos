import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { stringToColorBlocks } from "../lib/colorize.js";
// import { waitFor } from "../lib/wait.js";

const log = console.log;

const help = () => {
  log("Usage: setler kudos [command] [options]");
  log("");
  log("Commands:");
  log("  keys");
  log("  top");
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
  log("  setler kudos keys --json --profile 0");
  log("  setler kudos address");
  log("  setler kudos top 5 --profile 0");
  log("");

  process.exit(1);
};

// run sub command
const exec = async (context) => {
  const network = context.flags.network || "kudos";

  switch (context.input[1]) {
    case "top": {
      await gatekeep(context, true);

      // this would do a gql request to get the top N kudos and list them here
      log("top kudos tk");

      break;
    }
    case "address": {
      await gatekeep(context, true);

      if (!context.keys) {
        context.keys = await context.vault.keys();
      }

      // print the address
      if (context.flags.json) {
        log(JSON.stringify({ address: context.keys.kudos.address }));
      } else {
        log(`${context.keys.kudos.address}`);
        log(stringToColorBlocks(context.keys.kudos.address, network));
      }
      break;
    }
    case "keys": {
      await gatekeep(context, true);

      if (!context.keys) {
        context.keys = await context.vault.keys();
      }

      if (context.flags.json) {
        log(JSON.stringify(context.keys));
      } else {
        // output: export KUDOS_1=Base64EncodedJSON
        // base64Url encode
        const kudosKeysExportBase64 = Buffer.from(
          JSON.stringify({ kudos: context.keys.kudos })
        ).toString("base64url");

        log(`SETLER_KEYS_${context.profile}="${kudosKeysExportBase64}"`);
      }
      break;
    }
    default:
      if (
        !context.input[1] ||
        context.flags.help ||
        context.input[1] === "help"
      ) {
        // give help with available subcommands and flags
        help();
      }

      log(chalk.red(`Unknown command: ${context.input[1]}`));
      process.exit(1);
  }
};

export { exec };
