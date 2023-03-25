import * as child_process from "child_process";

import chalk from "chalk";

const log = console.log;

// run sub command
const exec = (context) => {
  const subcommand = context.input[1];
  const subcommands = context.config.get("subcommands") || {};
  if (subcommands[subcommand]) {
    let commandArgs = context.input.slice(2);
    if (!context.flags.quiet) {
      log(chalk.green(`Running ${subcommand}...`));
    }
    commandArgs.unshift(...subcommands[subcommand]);
    const out = child_process.execFileSync(
      commandArgs[0],
      commandArgs.slice(1),
      //      context.argv,
      {
        // input: context.stdin,
        stdio: "inherit",
      }
    );
    if (out) {
      log(out.toString());
    }
  } else {
    log("Usage: dosku run [subcommand]");
    log(chalk.yellow("You may need to install subcommands first with npx"));
    process.exit(2);
  }
};

export { exec };
