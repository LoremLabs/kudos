import chalk from "chalk";
import proxy from "./proxy.js";

const log = console.log;

// run sub command
const exec = (context) => {
  if (!context.flags.quiet) {
    log(`●\t${context.personality}\tv${context.version}`);
  }

  // check if there is a subcommand init too
  const subcommands = context.config.get("subcommands") || {};
  if (subcommands.init) {
    proxy("init").exec(context);
  }
};

export { exec };
