// local actions

import * as config from "./config.js";
import * as install from "./install.js";
import * as init from "./init.js";
import proxy from "./proxy.js";
import * as run from "./run.js";

const identify = proxy('identify');
const ink = proxy('ink');
const list = proxy('list');

export { config, identify, init, ink, install, list, run };
