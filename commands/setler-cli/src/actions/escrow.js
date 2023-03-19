import chalk from "chalk";
// import fetch from "node-fetch";
import prompts from "prompts";
import { gatekeep } from "../lib/wallet/gatekeep.js";

const log = console.log;

const exec = async (context) => {
  await gatekeep(context);

  switch (context.input[1]) {
    case "cancel": {
      const network = context.flags.network || "xrpl:testnet";

      const address = context.input[2]; // the escrow address
      if (!address) {
        log(
          chalk.red(
            `Usage: setler escrow cancel <address> --network="xrpl:testnet" --sequence="..."`
          )
        );
        process.exit(1);
      }

      let sequence = context.flags.sequence;
      if (!sequence) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "sequence",
          message: "Enter Sequence: ",
        });

        sequence = response.sequence;
      }
      if (!sequence) {
        log(
          chalk.red(
            `Usage: setler escrow cancel <address> --network="xrpl:testnet" --sequence="..."`
          )
        );
        process.exit(1);
      }
      sequence = parseInt(sequence, 10);

      // are you sure?
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: `Are you sure you want to cancel escrow ${address}?`,
        initial: false,
      });
      if (!response.value) {
        log(chalk.red(`Escrow ${address} not canceled`));
        process.exit(1);
      }

      const cancelPromise = context.coins.cancelEscrow({
        network,
        address: sourceAddress,
        sequence,
      });

      const canceled = await waitFor(cancelPromise, {
        text: `Canceling Escrow ${address}`,
      });

      if (canceled) {
        log(chalk.green(`Escrow ${address} canceled`));
      } else {
        log(chalk.red(`Escrow ${address} not canceled`));
      }

      break;
    }
    case "fulfill": {
      const network = context.flags.network || "xrpl:testnet";

      const address = context.input[2]; // the escrow address
      if (!address) {
        log(
          chalk.red(
            `Usage: setler escrow fulfill <address> --network="xrpl:testnet" --fulfillment="..."`
          )
        );
        process.exit(1);
      }

      let fulfillment = context.flags.fulfillment;
      if (!fulfillment) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "fulfillment",
          message: "Enter fulfillment: ",
        });

        fulfillment = response.fulfillment;
      }
      if (!fulfillment) {
        log(
          chalk.red(
            `Usage: setler escrow fulfill <address> --network="xrpl:testnet" --fulfillment="..." --sequence="..."`
          )
        );
        process.exit(1);
      }

      let sequence = context.flags.sequence;
      if (!sequence) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "sequence",
          message: "Enter Sequence: ",
        });

        sequence = response.sequence;
      }
      if (!sequence) {
        log(
          chalk.red(
            `Usage: setler escrow fulfill <address> --network="xrpl:testnet" --fulfillment="..." --sequence="..."`
          )
        );
        process.exit(1);
      }
      sequence = parseInt(sequence, 10);

      // are you sure?
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: `Are you sure you want to fulfill the escrow ${address}?`,
        initial: false,
      });
      if (!response.value) {
        log(chalk.red(`Escrow ${address} not fulfilled`));
        process.exit(1);
      }

      const fulfillPromise = context.coins.fulfillEscrow({
        network,
        address: sourceAddress, // estimate
        sequence,
        fulfillment,
      });

      const escrowResults = await waitFor(fulfillPromise, {
        text: `Fulfilling Escrow ${address}`,
      });

      if (escrowResults) {
        log(chalk.green(`Escrow ${address} fulfilled`));
      } else {
        log(chalk.red(`Escrow ${address} not fulfilled`));
      }
      break;
    }
    default: {
      log(chalk.red(`Unknown command: ${context.input[1]}`));
      break;
    }
  }
};

export { exec };
