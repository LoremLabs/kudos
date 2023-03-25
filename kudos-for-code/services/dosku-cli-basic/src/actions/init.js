import chalk from "chalk";

const log = console.log;

import { initDb } from "../lib/kudos.js";

// run sub command
const exec = async (context) => {
  const { flags } = context;

  if (!flags.quiet) {
    log(`○\t${context.personality}\tv${context.version}`);
  }

  if (flags.dbDir) {
    context.config.set(`${context.personality}.dbDir`, flags.dbDir);
    if (!flags.quiet) {
      log(chalk.green(`\tdbDir set to ${flags.dbDir}`));
    }
  }
  const dbDir = flags.dbDir
    ? flags.dbDir
    : context.config.get(`${context.personality}.dbDir`);

  // make sure database is initialized
  const db = await initDb({ dbDir });
  await db.destroy();
};

export { exec };
