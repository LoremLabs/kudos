import chalk from "chalk";

const log = console.log;

// config: get, set, del
const exec = (context) => {
  if (context.input[1] === "get") {
    if (context.flags.raw) {
      log(context.config.get(context.input[2]));
    } else {
      log(`${JSON.stringify(context.config.get(context.input[2]), null, 2)}`);
    }
  } else if (context.input[1] === "set") {
    if (context.flags.array) {
      // set array
      context.config.set(context.input[2], context.input.slice(3));
    } else {
      // set value
      if (context.input.length === 4) {
        context.config.set(context.input[2], context.input[3]);
      } else if (context.input.length === 3 && context.stdin.length > 0) {
        let data = context.stdin;
        data = data.replace(/\n$/, "");
        context.config.set(context.input[2], data);
      } else {
        log(
          chalk.red("Error: missing value. Set via STDIN or as a parameter.")
        );
        process.exit(2);
      }
    }
  } else if (context.input[1] === "del") {
    context.config.delete(context.input[2]);
  } else if (context.input[1] === "reset") {
    if (context.flags.yes) {
      Object.keys(context.config.get()).forEach((keyName) => {
        context.config.delete(keyName);
      });
    } else {
      log(
        chalk.red(
          "Reset config? This clears all configuration back to defaults."
        )
      );
      log("\nIf you are sure, repeat this command with the --yes flag.");
      process.exit(2);
    }
  } else {
    log("Usage: dosku config [get|set|reset|del]");
    process.exit(2);
  }
};

export { exec };
