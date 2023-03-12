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
    $ ${personality} help [command]

    $ ${personality} wallet
    $ ${personality} wallet help
    $ ${personality} wallet help [command]
    $ ${personality} wallet init --profile [profile] --scope [scope]
    $ ${personality} wallet keys
    $ ${personality} wallet mnemonic 
    $ ${personality} wallet mnemonic set
    $ ${personality} wallet mnemonic get

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
