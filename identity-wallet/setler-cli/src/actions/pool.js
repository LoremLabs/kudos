import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
import { readFileSync } from "fs";
// import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";

const log = console.log;

const help = () => {
  log("Usage: setler pool [command] [options]");
  log("");
  log("Commands:");
  log("  create");
  log("  ink [poolId] [--inFile]");
  log("  list [matching]");
  log("  get [poolId]");
  log("  summary [poolId]");
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
  log("  setler pool list 'my pool'");
  log("  setler pool list --poolName 'my pool'");
  log("  setler pool list --poolId abcDef");
  log("  setler pool ink --poolId abcDef --inFile=pool.ndjson");
  log("  setler pool ink abcDef");
  log("  setler pool summary abcDef");
  log("");

  process.exit(1);
};

// run sub command
const exec = async (context) => {
  const network = context.flags.network || "kudos";

  switch (context.input[1]) {
    case "get": {
      await gatekeep(context, true);

      const keys = await context.vault.keys();

      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to retrieve?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }

      let getResults = {};
      try {
        const getPromise = context.auth.getPool({
          network,
          address: sourceAddress,
          poolId,
          frozenPoolId: context.flags.frozenPoolId || "",
        });
        getResults = await waitFor(getPromise, {
          text: `Retrieving pool...`,
        });
      } catch (error) {
        log(chalk.red(`Error getting pool: ${error.message}`));
        process.exit(1);
      }

      const out = JSON.parse(getResults.response.out);
      log(`${JSON.stringify(out, null, 2)}`);

      break;
    }
    case "summary": {
      await gatekeep(context, true);

      const keys = await context.vault.keys();

      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to retrieve?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }

      let amount = parseFloat(context.flags.amount).toFixed(6).toString();

      let getResults = {};
      try {
        const getPromise = context.auth.getPoolSummary({
          network,
          address: sourceAddress,
          poolId,
          amount,
          frozenPoolId: context.flags.frozenPoolId || "",
        });
        getResults = await waitFor(getPromise, {
          text: `Retrieving pool...`,
        });
      } catch (error) {
        log(chalk.red(`Error getting pool: ${error.message}`));
        process.exit(1);
      }

      const out = JSON.parse(getResults.response.out);
      log(`${JSON.stringify(out, null, 2)}`);

      break;
    }
    case "events": {
      await gatekeep(context, true);

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to retrieve?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }
      let startTs = context.flags.startTs || context.input[3];
      if (!startTs) {
        // prompt for startTs
        const response = await prompts({
          type: "text",
          name: "startTs",
          message:
            "What starting time do you want? (24h, 1d, 1M, 30s, etc. or the timestamp in ms) ",
          initial: "-24h",
        });
        startTs = response.startTs;
      }

      if (!startTs) {
        log(chalk.red("startTs is required"));
        process.exit(1);
      }

      let endTs = context.flags.endTs || context.input[4];
      if (!endTs) {
        endTs = "now";
      }

      let limit = context.flags.limit || 25;
      let limitOffset = context.flags.limitOffset || 0;

      let listResults = {};
      try {
        const listPromise = context.auth.getEvents({
          network,
          poolId,
          startTs,
          endTs,
          limit,
          limitOffset,
        });
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
    case "frozen": {
      await gatekeep(context, true);

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to retrieve?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }

      let listResults = {};
      try {
        const listPromise = context.auth.listFrozenPools({ network, poolId });
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
    case "list": {
      await gatekeep(context, true);

      let matching = context.input[2] || "";

      if (context.flags.poolName) {
        matching = context.flags.poolName;

        if (Array.isArray(matching)) {
          log(chalk.red(`Can only specify one pool name`));
          process.exit(1);
        }

        // add n: prefix if it's not already there
        if (!matching.startsWith("n:")) {
          matching = "n:" + matching;
        }
      } else if (context.flags.poolId) {
        matching = context.flags.poolId;

        if (Array.isArray(matching)) {
          log(chalk.red(`Can only specify one pool id`));
          process.exit(1);
        }

        // add i: prefix if it's not already there
        if (!matching.startsWith("i:")) {
          matching = "i:" + matching;
        }
      }

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
    case "ink": {
      // save ("ink") to a pool
      await gatekeep(context, true, { networks: ["kudos"] });

      const keys = await context.vault.keys();
      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      // input can be stdin or a file
      let input = "";
      if (context.flags.inFile) {
        // read from file
        input = readFileSync(context.flags.inFile, "utf8");
      } else {
        input = context.stdin;
      }

      // convert input (ndjson) into an array of kudos
      const kudos = [];
      const lines = input.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
          const kudo = JSON.parse(line);
          kudos.push(kudo);
        }
      }

      //  setler kudos identify . | setler pool ink | jq
      // log(`${input}`);

      // allow identResolver to be specified
      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to store these in?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }

      // see if we have any kudos to ink
      if (kudos.length === 0) {
        log(chalk.red(`No kudos to ink`));
        process.exit(1);
      }

      // do a gql request to send this to the pool
      let inkResults = {};
      try {
        const inkPromise = context.auth.inkKudos({
          address: sourceAddress,
          network,
          poolId,
          kudos,
        });
        inkResults = await waitFor(inkPromise, {
          text: `Inking pool...`,
        });
      } catch (error) {
        log(chalk.red(`Error inking pool ${error.message}`));
        process.exit(1);
      }

      if (!context.flags.quiet) {
        const out = JSON.parse(inkResults.response.out);

        log(chalk.green(`✅ Pool inked`));

        log(`${JSON.stringify(out, null, 2)}`);
      }

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
