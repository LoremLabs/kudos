import chalk from "chalk";
import { create, store } from "../lib/kudos.js";

const log = console.log;
// const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const exec = async (context) => {
  const flags = context.flags;
  const kudoData = {}; // no such thing as a kudo, except here, a singular kudos h/t stpeter
  kudoData.createTime = flags.createTime
    ? new Date(flags.createTime).toISOString()
    : new Date().toISOString(); // '2022-03-07T10:27:27.718Z'
  kudoData.weight = flags.weight ? parseFloat(flags.weight) : 100;
  kudoData.src = flags.src ? flags.src : "cli";
  kudoData.description = flags.description ? flags.description : "";

  if (context.input[1]) {
    // we have an identifier
    kudoData.identifier = context.input[1];
    const kudo = await create(kudoData);
    if (flags.verbose) {
      log(
        chalk.green(
          `Kudos ${kudo.identifier} created at ${kudo.createTime} with weight ${kudo.weight}`
        )
      );
    }
    store(kudo);
  } else {
    log(
      'Usage: kudos ink [identifier.twitter] [--weight=1] [--createTime=now] [--src=cli] [--description=""]'
    );
    process.exit(2);
  }
};

export { exec };
