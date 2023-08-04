import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";

const log = console.log;

const help = () => {
  log("");
  log(chalk.bold(`setler: send and receive encrypted messages`));
  log(`setler message [send | receive]`);
  log("");
  log(chalk.bold(`send help: show this help`));
  log("");
};

const exec = async (context) => {
  switch (context.input[1]) {
    case "chat": {
      // local test to see if encryption works
      await gatekeep(context);

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

      // who are we chatting with?
      let address = context.flags.address || context.input.slice(2);
      if (!address) {
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "address",
            message: `Enter the address to chat with: `,
            initial: false,
          },
        ]);
        if (!response.address) {
          process.exit(1);
        }
        address = response.address;
      }

      // if address is an array, use the first element
      if (Array.isArray(address)) {
        address = address[0];
      }

      // get public key from address
      const getPubKeyPromise = context.coins.getPublicKey({
        address,
        network,
      });
      const { publicKey } = await waitFor(getPubKeyPromise, {
        text: `Getting public key for ` + chalk.blue(`${address}`),
      });

      if (!publicKey) {
        log(chalk.red(`send: could not get public key for ${address}`));
        process.exit(1);
      }

      if (context.debug) {
        log(chalk.magenta(`Public key: ${publicKey}`));
      }

      // warn that this will cost 1 drop per message
      log("");
      const { width } = windowSize.get();
      log(" " + "─".repeat(width - 2));

      log(
        "Chatting with " +
          chalk.blue(`${address}`) +
          " on " +
          chalk.blue(`${network}`) +
          " as " +
          chalk.blue(`${sourceAddress}`)
      );
      log(
        " ".repeat(`Chatting with `.length) +
          stringToColorBlocks(address, network) +
          " ".repeat(` on ${network} as `.length) +
          stringToColorBlocks(sourceAddress, network)
      );

      log(" " + "─".repeat(width - 2));
      log("");
      log(
        chalk.bold(
          chalk.red(`Warning: this will cost 1 drop per message sent.`)
        )
      );

      // start the chat
      // listen for messages to our address
      await context.coins.listen({
        address: sourceAddress,
        network,
      });
      context.coins.on("chat", async (message) => {
        const { decrypted } = await context.coins.decrypt({
          address: sourceAddress,
          encrypted: message.data,
        });
        log("> [" + chalk.gray(`${address}`) + "] " + decrypted);
      });

      let chatting = true;
      while (chatting) {
        // get a message
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "cleartext",
            message: `> `,
            initial: false,
          },
        ]);
        if (!response.cleartext) {
          process.exit(1);
        }
        const cleartext = response.cleartext;

        // send a chat message to the user
        const chatPromise = context.coins.chat({
          publicKey, // of person we're chatting with
          address,
          sourceAddress,
          network,
          message: cleartext,
        });
        await waitFor(chatPromise, {
          text: `Sending message`,
        });
      }

      await context.coins.disconnect();

      break;
    }
    case "send": {
      // send an encrypted message to an address using the public key of the address
      await gatekeep(context);

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

      if (context.debug) {
        log(chalk.magenta(`Source address: ${sourceAddress}`));
      }

      let cleartext = context.flags.message;

      if (!cleartext) {
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "cleartext",
            message: `Enter a message to encrypt: `,
            initial: false,
          },
        ]);
        if (!response.cleartext) {
          process.exit(1);
        }
        cleartext = response.cleartext;
      }

      // who are we sending to?
      let address = context.flags.address || context.input.slice(2);
      if (!address) {
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "address",
            message: `Enter the address to send to: `,
            initial: false,
          },
        ]);
        if (!response.address) {
          process.exit(1);
        }
        address = response.address;
      }
      // if address is an array, use the first element
      if (Array.isArray(address)) {
        address = address[0];
      }

      // get public key from address
      const getPubKeyPromise = context.coins.getPublicKey({
        address,
        network,
      });
      const { publicKey } = await waitFor(getPubKeyPromise, {
        text: `Getting public key for ` + chalk.blue(`${address}`),
      });

      if (!publicKey) {
        log(chalk.red(`send: could not get public key for ${address}`));
        process.exit(1);
      }

      if (context.debug) {
        log(chalk.magenta(`Public key: ${publicKey}`));
      }

      // encrypt the message
      const encryptPromise = context.coins.encrypt({
        publicKey,
        message: cleartext,
      });
      const { encrypted } = await waitFor(encryptPromise, {
        text: `Encrypting message`,
      });

      if (!encrypted) {
        log(chalk.red(`send: could not encrypt message`));
        process.exit(1);
      }

      // print the encrypted message
      log("");
      log(chalk.bold(`Encrypted message:`));
      log(encrypted);
      log("");

      await context.coins.disconnect();

      break;
    }
    case "receive": {
      // send an encrypted message to an address using the public key of the address
      await gatekeep(context);

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

      let ciphertext = context.flags.message;

      if (!ciphertext) {
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "cleartext",
            message: `Enter a message to decrypt: `,
            initial: false,
          },
        ]);
        if (!response.ciphertext) {
          process.exit(1);
        }
        ciphertext = response.ciphertext;
      }

      // encrypt the message
      const encryptPromise = context.coins.decrypt({
        address: sourceAddress,
        encrypted: ciphertext,
      });
      const { decrypted } = await waitFor(encryptPromise, {
        text: `Decrypting message`,
      });

      if (!decrypted) {
        log(chalk.red(`send: could not decrypted message`));
        process.exit(1);
      }

      // print the decrypted message
      log("");
      log(decrypted.toString());
      log("");

      await context.coins.disconnect();

      break;
    }
    case "help": {
      help();
      break;
    }
    default: {
      log(chalk.red(`send: unknown subcommand ${context.input[1] || ""}`));
      help();
      break;
    }
  }
};

export { exec };
