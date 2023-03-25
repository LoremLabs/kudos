import chalk from "chalk";

const log = console.log;

// run sub command
const exec = (context) => {
  const subcommand = context.input[1];
  const subcommands = context.config.get("subcommands") || {};
  if (subcommand) {
    subcommands[subcommand] = context.input.slice(2);
    context.config.set("subcommands", subcommands);
    if (!context.flags.quiet) {
      log(chalk.green(`Installed ${subcommand}.`));
    }
    process.exit(0);
  } else {
    log("Usage: dosku install [subcommand] [command path and flags]");
    process.exit(2);
  }
};

export { exec };
