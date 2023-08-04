import chalk from "chalk";
// import fetch from "node-fetch";
import { gatekeep } from "../lib/wallet/gatekeep.js";
// import prompts from "prompts";
// import jsonColorize from "json-colorizer";
import { stringToColorBlocks } from "../lib/colorize.js";
// import sysOpen from "open";
// import { waitFor } from "../lib/wait.js";
// import windowSize from "window-size";

const log = console.log;

const exec = async (context) => {
  switch (context.input[1]) {
    default: {
      await gatekeep(context);

      // are we currently logged in? that would be in the config?
      const network =
        context.flags.network || context.config.network || "xrpl:testnet";
      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      // const { width } = windowSize.get();
      // log(" " + "─".repeat(width - 2));

      // print out our source address
      log("");
      log(`${sourceAddress} on ${network}`);
      log(" ".repeat(``.length) + stringToColorBlocks(sourceAddress, network));

      break;
    }
  }
};

export { exec };
