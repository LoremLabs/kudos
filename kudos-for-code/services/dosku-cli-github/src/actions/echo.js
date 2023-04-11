import chalk from "chalk";

const log = console.log;

// run sub command
const exec = (context) => {
  if (!context.flags.quiet) {
    log(`via: ${context.personality}\n`);
    log(chalk.green(`${JSON.stringify(context, null, 2)}`));
  }
};

export { exec };
