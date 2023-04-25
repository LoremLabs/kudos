import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
// import fetch from "node-fetch";
import prompts from "prompts";
import { waitFor } from "../lib/wait.js";

const log = console.log;

const exec = async (context) => {
  await gatekeep(context);

  switch (context.input[1]) {
    case "cancel": {
      const network = context.flags.network || "xrpl:testnet";

      // get input
      let address = context.flags.address || context.vault.address;
      if (!address) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "address",
          message: "Enter escrow address: ",
        });

        address = response.address;

        if (!address) {
          log(
            chalk.red(
              `Usage: setler escrow fulfill --network="xrpl:testnet" --address="..." --sequence="..." --fulfillment="..." --condition="..."`
            )
          );
          process.exit(1);
        }
      }

      let condition = context.flags.condition;
      if (!condition) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "condition",
          message: "Enter escrow condition: ",
        });

        condition = response.condition;

        if (!condition) {
          log(
            chalk.red(
              `Usage: setler escrow fulfill --network="xrpl:testnet" --address="..." --sequence="..." --fulfillment="..." --condition="..."`
            )
          );
          process.exit(1);
        }
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
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
          )
        );
        process.exit(1);
      }

      let owner = context.flags.owner;
      if (!owner) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "owner",
          message: "Enter Owner address: ",
        });

        owner = response.owner;
      }

      if (!owner) {
        log(
          chalk.red(
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
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
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
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
        address,
        owner,
        condition,
        fulfillment,
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
      const network =
        context.flags.network || context.config.network || "xrpl:testnet";

      let address = context.flags.address || context.vault.address;
      if (!address) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "address",
          message: "Enter escrow address: ",
        });

        address = response.address;

        if (!address) {
          log(
            chalk.red(
              `Usage: setler escrow fulfill --network="xrpl:testnet" --address="..." --sequence="..." --fulfillment="..." --condition="..."`
            )
          );
          process.exit(1);
        }
      }

      let condition = context.flags.condition;
      if (!condition) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "condition",
          message: "Enter escrow condition: ",
        });

        condition = response.condition;

        if (!condition) {
          log(
            chalk.red(
              `Usage: setler escrow fulfill --network="xrpl:testnet" --address="..." --sequence="..." --fulfillment="..." --condition="..."`
            )
          );
          process.exit(1);
        }
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
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
          )
        );
        process.exit(1);
      }

      let owner = context.flags.owner;
      if (!owner) {
        // prompt user for it
        const response = await prompts({
          type: "text",
          name: "owner",
          message: "Enter Owner address: ",
        });

        owner = response.owner;
      }

      if (!owner) {
        log(
          chalk.red(
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
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
            `Usage: setler escrow fulfill --network="xrpl:testnet" --fulfillment="..." --sequence="..." --condition="..."`
          )
        );
        process.exit(1);
      }
      sequence = parseInt(sequence, 10);

      // are you sure?
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: chalk.cyan(
          `Are you sure you want to fulfill the escrow ${owner} - ${sequence}?`
        ),
        initial: false,
      });
      if (!response.value) {
        log(chalk.red(`Escrow ${address} not fulfilled`));
        process.exit(1);
      }

      const fulfillPromise = context.coins.fulfillEscrow({
        address,
        owner,
        condition,
        fulfillment,
        network,
        sequence,
      });

      let escrowResults;
      try {
        escrowResults = await waitFor(fulfillPromise, {
          text: `Fulfilling Escrow ${address}`,
        });
      } catch (e) {
        log(chalk.red(`Escrow fulfillment ${e.message}`));
      }
      if (escrowResults) {
        log(escrowResults);
        log(chalk.green(`Escrow ${escrowResults.hash} fulfilled`));
      }
      break;
    }
    default: {
      log(chalk.red(`Unknown command: ${context.input[1]}`));
      break;
    }
  }
  context.coins.disconnect();
};

export { exec };
