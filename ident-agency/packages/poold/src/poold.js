#!/usr/bin/env tsx

// #!/usr/bin/env node

// import updateNotifier from "update-notifier";
import { URL } from "url";
import config from "./config.js";
import dotenv from "dotenv";
import fs from "fs";
import meow from "meow";
import path from "path";
import poold from "./index.js";
const __dirname = new URL(".", import.meta.url).pathname;
const personality = __dirname.split("/").slice(-3)[0];

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pkgJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"))
);

const defaultHelp = `
  poold: ${pkgJson.description}

  $ poold --help

  Usage
    $ poold start

  Options
    --debug=[bool]  [Default: false]
    --help          [Default: false]

    Examples

    Config
    $ poold config get
    $ poold config get cmd.preserve-url --raw 
    $ poold config set key.subkey val
    $ poold config set arrayKey val1 val2 --array
    $ poold config del key

    Run Deamon
    $ poold start
`;

const cli = meow(defaultHelp, {
  importMeta: import.meta,
  flags: {
    nodeId: {
      type: "string",
      isMultiple: true,
      // default: [],
    },
    bootstrap: {
      type: "string",
      isMultiple: true,
      // default: [],
    },
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
poold({
  action: cli.input[0],
  flags: cli.flags,
  input: cli.input,
  config,
  personality,
  version: pkgJson.version,
  argv: process.argv.slice(2),
  startTs: Date.now(),
});

// updateNotifier({
//   pkg: pkgJson,
//   defer: true,
// }).notify();
