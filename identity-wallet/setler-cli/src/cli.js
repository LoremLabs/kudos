#!/usr/bin/env node

// import updateNotifier from "update-notifier";
import { URL } from "url";
import config from "./config.js";
import dotenv from "dotenv";
import fs from "fs";
import meow from "meow";
import path from "path";
import setler from "./index.js";
const __dirname = new URL(".", import.meta.url).pathname;
const personality = __dirname.split("/").slice(-3)[0];

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pkgJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"))
);

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

    Run Commands
    $ ${personality} help

    $ ${personality} wallet
    $ ${personality} wallet help
    $ ${personality} wallet help [command]
    $ ${personality} wallet init --profile [profile] --scope [scope]
    $ ${personality} wallet keys
    $ ${personality} wallet mnemonic 
    $ ${personality} wallet mnemonic set
    $ ${personality} wallet mnemonic get

    $ ${personality} kudos
    $ ${personality} kudos help
    $ ${personality} kudos identify

    $ ${personality} auth    

    $ ${personality} pool
    $ ${personality} pool help
    $ ${personality} pool create
    $ ${personality} pool list
    $ ${personality} pool list [matching]
    $ ${personality} pool list --poolName [poolName]
    $ ${personality} pool list --poolId [poolId]
    $ ${personality} pool list --profile [profile]

    $ ${personality} send
    $ ${personality} send help
    

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
