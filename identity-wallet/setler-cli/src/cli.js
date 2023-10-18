#!/usr/bin/env node

// import updateNotifier from "update-notifier";
import { URL, fileURLToPath } from "url";
import config from "./config.js";
import dotenv from "dotenv";
import fs from "fs";
import meow from "meow";
import path from "path";
import setler from "./index.js";
// const __dirname = new URL(".", import.meta.url).pathname;
const __dirname = fileURLToPath(new URL(".", import.meta.url));
let personality = __dirname.split("/").slice(-3)[0];
personality = personality.replace("-cli", "");

dotenv.config({ path: path.join(__dirname, "..", "/.env") });

const pkgPath = path.join(__dirname, "..", "package.json");
const pkgJson = JSON.parse(fs.readFileSync(pkgPath));

// squelch experimental warnings
const originalEmit = process.emit;
process.emit = function (name, data) {
  // , ...args
  if (
    name === `warning` &&
    typeof data === `object` &&
    data.name === `ExperimentalWarning`
    //if you want to only stop certain messages, test for the message here:
    //&& data.message.includes(`Fetch API`)
  ) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

const defaultHelp = `
  ${personality}: additional commands

  $ ${personality} --help 

  Usage
    $ ${personality} [input]

  Options
    --debug=[bool]  [Default: false]
    --help          [Default: false]
    --quiet         [Default: false]

    Examples
    $ ${personality}

    Check Version
    $ ${personality} --version

    Run Commands
    $ ${personality} help

    $ ${personality} whoami
    $ ${personality} whoami publickey

    $ ${personality} wallet
    $ ${personality} wallet help
    $ ${personality} wallet help [command]
    $ ${personality} wallet init --profile [profile] --wallet [wallet]
    $ ${personality} wallet keys
    $ ${personality} wallet mnemonic 
    $ ${personality} wallet mnemonic set
    $ ${personality} wallet mnemonic get
    $ ${personality} wallet send
    $ ${personality} wallet receive
    $ ${personality} wallet balance

    $ ${personality} kudos
    $ ${personality} kudos help
    $ ${personality} kudos send --poolId [poolId] [--poolEndpoint endpointurl]
    $ ${personality} kudos identify
    $ ${personality} kudos create

    $ ${personality} auth
    $ ${personality} auth help
    $ ${personality} auth login
    $ ${personality} auth delegate    

    $ ${personality} message
    $ ${personality} message send
    $ ${personality} message receive
    $ ${personality} message chat

    $ ${personality} pool
    $ ${personality} pool help
    $ ${personality} pool create
    $ ${personality} pool list
    $ ${personality} pool list [matching]
    $ ${personality} pool list --poolName [poolName]
    $ ${personality} pool list --poolId [poolId]
    $ ${personality} pool list --profile [profile]
    $ ${personality} pool ink --poolId [poolId] --inFile [inFile]
    $ ${personality} pool summary [poolId]
    $ ${personality} pool events --poolId [poolId] [--startTs="-2d"]
    $ ${personality} pool frozen --poolId XkaT2LKYSUL6pUAqqTxNxd 

    $ ${personality} send
    $ ${personality} send help
    
    $ ${personality} config
    $ ${personality} config ident resolver [get | set] [url]
    $ ${personality} config auth [get | set] 


    `;

const cli = meow(defaultHelp, {
  importMeta: import.meta,
  flags: {
    // transaction: {
    //   type: "string",
    //   default: "",
    // },
    // wallet: {
    //   type: "string",
    //   default: "",
    // },
    // debug: {
    //   type: "boolean",
    //   default: false,
    // }
  },
});
if (cli.input.length === 0 || cli.input[0] === "help") {
  process.stderr.write(`${defaultHelp}\n`);
  process.exit(0);
}

setler({
  action: cli.input[0],
  flags: cli.flags,
  input: cli.input,
  config,
  personality,
  version: pkgJson.version,
  bin: `${__dirname}cli.js`,
});

// updateNotifier({
//   pkg: pkgJson,
//   defer: true,
// }).notify();
