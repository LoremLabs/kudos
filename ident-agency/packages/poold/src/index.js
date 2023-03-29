import * as actions from "./actions/index.js"; // add new top level actions here

import { setContextFunctions, setFlagDefaults } from "./lib/env.js";

import chalk from "chalk";

const log = console.log;

// call the action with the given name
const poold = async (commandInput) => {
  const { action, argv, flags, input } = commandInput;
  flags.debug &&
    log(chalk.green(JSON.stringify({ action, argv, flags, input })));

  if (Object.prototype.hasOwnProperty.call(actions, action)) {
    const context = { ...commandInput, stdin: process.stdin };

    setContextFunctions(context);
    setFlagDefaults(context); // allow flag defaults to be set from ENV
    actions[action].exec(context);
  } else {
    log(chalk.red(`action ${action} not found`));
    process.exit(1);
  }
};

export default poold;
