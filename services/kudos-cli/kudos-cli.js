#!/usr/bin/env node
import meow from "meow";
// import updateNotifier from "update-notifier";
import { URL } from 'url'; 
const __dirname = new URL('.', import.meta.url).pathname;

import dotenv from "dotenv";
dotenv.config({ path: __dirname + '.env' });

import config from "./src/config.js";
import kudos from "./src/index.js";

// const pkgJson = JSON.parse(fs.readFileSync("./package.json"));

const defaultHelp = `
  kudos: command line for kudos

  $ kudos --help

  Usage
    $ kudos [input]

  Options
    --debug=[bool]  [Default: false]
    --help          [Default: false]

    Examples
    $ kudos

    Config
    $ kudos config get
    $ kudos config get cmd.preserve-url --raw 
    $ kudos config set key.subkey val
    $ kudos config set arrayKey val1 val2 --array
    $ kudos config del key

    Run Commands
    $ kudos ink [identifier.twitter] [--weight=100] [--createTime=now] [--src=cli] [--description=""] [--user=1]
    $ kudos ledger [reset|weighted|summary] [--cohort=current] [--outFile=STDOUT] [--timestamp=now] [--quiet=false] [--escrow=escrow] [--settle=100]
    $ kudos resolve [identifier.twitter]
    $ kudos settle [cohort] --cohort=202223 --amount=10 

    Submit Kudos
    % kudos ledger | kudos settle cohort --cohort=202223 --amount=10
`;

const cli = meow(defaultHelp, {
  importMeta: import.meta,
  flags: {
    transaction: {
      type: "string",
      default: ''
    },
    wallet: {
      type: "string",
      default: ''
    }
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

kudos({ action: cli.input[0], flags: cli.flags, input: cli.input, config });

// updateNotifier({
//   pkg: pkgJson,
//   defer: true,
// }).notify();
