import chalk from "chalk";
import getStdin from "get-stdin";

import * as actions from "./actions/index.js"; // add new top level actions here
import { setFlagDefaults, setContextFunctions } from "./lib/env.js";

const log = console.log;

// call the action with the given name
const dosku = async (commandInput) => {
  // read from STDIN. stdin = '' if no input
  // const stdin = await getStdin();
  const stdin = process.stdin;
  const { action, flags, input } = commandInput;
  flags.debug &&
    log(chalk.green(JSON.stringify({ action, flags, stdin, input })));

  if (Object.prototype.hasOwnProperty.call(actions, action)) {
    const context = { ...commandInput, stdin };

    setContextFunctions(context);
    setFlagDefaults(context); // allow flag defaults to be set from ENV
    actions[action].exec(context);
  } else {
    log(chalk.red(`ACtion ${action} not found`));
    process.exit(1);
  }
};

export default dosku;
