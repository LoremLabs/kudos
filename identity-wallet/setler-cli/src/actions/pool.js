import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";

const log = console.log;

const help = () => {
  log("Usage: setler pool [command] [options]");
  log("");
  log("Commands:");
  log("  create");
  log("  list");
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
  log("  setler pool list --profile 0");
  log("");

  process.exit(1);
};

// run sub command
const exec = async (context) => {
  const network = context.flags.network || "kudos";

  switch (context.input[1]) {
    case "list": {
      await gatekeep(context, true);

      let matching = context.input[2] || "";

      let listResults = {};
      try {
      const listPromise = context.auth.listPools({ network, matching });
      listResults = await waitFor(listPromise, {
        text: `Fetching pools...`,
      });
    } catch (error) {
      log(chalk.red(`Error listing pools: ${error.message}`));
      process.exit(1);
    }

  const out = JSON.parse(listResults.response.out);    

    log(`${JSON.stringify(out, null, 2)}`);

      break;
    }
    case "create": {
      await gatekeep(context, true);

      let poolName = context.input[2];
      if (!poolName) {
        // prompt for poolName
        const response = await prompts({
          type: "text",
          name: "poolName",
          message: "What is the name of the pool?",
        });
        poolName = response.poolName;
      }

      if (!poolName) {
        log(chalk.red("Pool name is required"));
        process.exit(1);
      }

      // do a gql request to create a pool
      let createResults = {};
      try {
      const createPromise = context.auth.createPool({ network, poolName });
      createResults = await waitFor(createPromise, {
        text: `Creating pool...`,
      });
    } catch (error) {
      log(chalk.red(`Error creating pool: ${error.message}`));
      process.exit(1);
    }

  const out = JSON.parse(createResults.response.out);    


  log(chalk.green(`✅ Pool created`));

    log(`${JSON.stringify(out, null, 2)}`);

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
