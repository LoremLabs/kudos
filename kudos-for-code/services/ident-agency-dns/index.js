#!/usr/bin/env node
import meow from "meow";

const defaultHelp = `
  ident-agency-dns: dns resolver for ident.agency lookup service

  $ node index.js --help

  $ node index.js start [--port=<5053>] [--host=<0.0.0.0>] [--pingPort=<8080>] [--debug=false]

  Test DNS
  dig @127.0.0.1 -p5053 _kudos.mankins.twitter.ident.agency
  `;

const cli = meow(defaultHelp, {
  importMeta: import.meta,
  flags: {
    debug: {
      type: "boolean",
      default: false,
    },
    port: {
      type: "number",
      default: 5053,
    },
    ttl: {
      type: "number",
      default: 30,
    },
    host: {
      type: "string",
      default: "0.0.0.0",
    },
    pingPort: {
      type: "number",
      default: 8080,
    },
  },
});

if (cli.input.length === 0 || cli.input[0] === "help") {
  process.stderr.write(`${defaultHelp}\n`);
  process.exit(0);
}

const context = { action: cli.input[0], flags: cli.flags, input: cli.input };
switch (cli.input[0]) {
  case "start":
    import("./src/start.js").then(({ default: start }) => {
      start(context);
    });
    break;
  default:
    process.stderr.write(`${defaultHelp}\n`);
    process.exit(0);
}
