import chalk from "chalk";
import { identToPaymentAddress } from "../lib/ident.js";

const log = console.log;
// const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const exec = async (context) => {
  // const flags = context.flags;

  if (context.input[1]) {
    // we have an identifier
    const identifier = context.input[1];
    const paymentAddress = await identToPaymentAddress(identifier);
    if (paymentAddress) {
      log(chalk.green(paymentAddress));
    } else {
      log(
        chalk.red(`No payment address found for ${identifier}, will use escrow`)
      );
    }
  } else {
    log("Usage: kudos resolve [identifier.twitter]");
    process.exit(2);
  }
};

export { exec };
