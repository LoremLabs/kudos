#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import meow from "meow";
// import updateNotifier from "update-notifier";
import { URL } from "url";
const __dirname = new URL(".", import.meta.url).pathname;
const personality = __dirname.split("/").slice(-3)[0];

import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import config from "./config.js";
import dosku from "./index.js";

const pkgJson = JSON.parse(fs.readFileSync( path.resolve(__dirname, "../package.json")));

const defaultHelp = `
  dosku: command line for dosku

  $ dosku --help

  Usage
    $ dosku [input]

  Options
    --debug=[bool]  [Default: false]
    --help          [Default: false]

    Examples

    Installed as a global package:
    $ dosku ...

    Via Npx, without installing:
    $ npx @kudos-protocol/dosku-cli@next ...

    Init
    $ dosku init [--dbDir=.]

    Config
    $ dosku config get
    $ dosku config get cmd.preserve-url --raw 
    $ dosku config set key.subkey val
    $ dosku config set arrayKey val1 val2 --array
    $ dosku config del key

    Basic Kudos Protocol
    $ dosku ink [<STDIN = json new line delimited>] [twitter:identifier] [--weight=1] [--createTime=now] [--src=cli] [--description=""]
    $ dosku list [--cohort=current] [--outFile=STDOUT] [--timestamp=now] [--quiet=false]
    $ dosku identify [--outFile=STDOUT] [--kudosFile=kudos.yml] SEARCH_DIR

    Run Commands
    $ dosku run subcommand
    looks up subcommand and executes -> dosku.personality subcommand @params
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
dosku({
  action: cli.input[0],
  flags: cli.flags,
  input: cli.input,
  config,
  personality,
  version: pkgJson.version,
  argv: process.argv.slice(2),
});

// updateNotifier({
//   pkg: pkgJson,
//   defer: true,
// }).notify();
