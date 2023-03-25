import * as child_process from "child_process";

import chalk from "chalk";

const log = console.log;

// proxy to defined command
const proxy = (subcommand) => {
  const exec = (context) => {
    const subcommands = context.config.get("subcommands") || {};
    if (subcommands[subcommand]) {
      let commandArgs = context.input.slice(1);
      commandArgs.unshift(...subcommands[subcommand]);
      // log(commandArgs[0], { commandArgs, flags: context.flags, argv: context.argv });
      try {
        const out = child_process.execFileSync(commandArgs[0], context.argv, {
          //        input: context.stdin,
          stdio: "inherit",
//          maxBuffer: 1024 * 1024 * 1024,
        });
        if (out) {
          log(out.toString());
        }
      } catch (e) {
//        log({ e });
        if (e.output) {
          e.output.forEach((thing) => {
            if (thing) {
              log(thing.toString());
            }
          });
        }
        process.exit(e.status);
      }
    } else {
      log(
        chalk.yellow(
          "You may need to install an implementation of this first with npx"
        )
      );
      process.exit(2);
    }
  };
  return { exec };
};

export default proxy;