#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import meow from "meow";
import { URL } from "url";
const __dirname = new URL(".", import.meta.url).pathname;
const personality = __dirname.split("/").slice(-3)[0];

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import config from "./config.js";
import dosku from "./index.js";

const pkgJson = JSON.parse(fs.readFileSync( path.resolve(__dirname, "../package.json")));

const defaultHelp = `
  ${personality}: additional commands for doksu

  $ ${personality} --help

  Usage
    $ ${personality} [input]

  Options
    --debug=[bool]  [Default: false]
    --help          [Default: false]
    --quiet         [Default: false]

    Examples
    $ ${personality}

    Install
    % ${personality} enable --all
    % ${personality} init [--dbDir=.]

    Run Commands
    $ ${personality} echo
    $ ${personality} identify
    $ ${personality} ink
    $ ${personality} list
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
  bin: `${__dirname}cli.js`,
});

// updateNotifier({
//   pkg: pkgJson,
//   defer: true,
// }).notify();
