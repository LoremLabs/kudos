import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
import qrcode from "qrcode-terminal";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";

const log = console.log;

export const help = () => {
  // give help with available subcommands and flags
  log("Usage: setler wallet [command] [options]");
  log("");
  log("Commands:");
  log("  init");
  log("  keys");
  log("  mnemonic {get,set}");
  log("  fund");
  log("  receive");
  log("  balance");
  log("");
  log("Options:");
  log(
    "  --profile <profile> - default: 0, 1, 2, ... Same mnemonic, different keys"
  );
  log(
    "  --scope <scope> - default: 0, 1, 2, ... Different mnemonic, different keys"
  );
  log("  --passPhrase <passPhrase> - default: ''");
  log("  --yes - default: false");
  log("");
  log("Examples:");
  log("  setler wallet init --profile 0 --scope 5");
  log("  setler wallet keys --profile 1 --scope 5");
  log("  setler wallet mnemonic --yes --scope 0");
  log("  setler wallet mnemonic set --scope 1");
  log("  setler wallet balance --network xrpl:testnet --profile 0");
  log("");

  process.exit(1);
};

const exec = async (context) => {
  // switch based on the subcommand
  switch (context.input[1]) {
    case "init":
      await gatekeep(context, true);
      break;
    case "receive": {
      await gatekeep(context);

      let network =
        context.flags.network || context.config.network || "xrpl:testnet";
      if (network === "testnet") {
        network = "xrpl:testnet";
      }
      const keys = await context.vault.keys();
      let walletAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        walletAddress = keys[network].address;
      } else {
        walletAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      // ask user for address, amount, and tag
      const response = await prompts([
        {
          type: "text",
          name: "address",
          message: `Enter the address from which you want to receive: `,
          initial: walletAddress,
        },
        {
          type: "text",
          name: "amount",
          message: `Enter the amount you want to receive (in XRP): `,
          initial: "1.01",
        },
        {
          type: "text",
          name: "tag",
          message: `Enter the destination tag for this transaction: `,
          initial: false,
        },
      ]);

      if (!response.address || !response.amount) {
        process.exit(1);
      }

      walletAddress = response.address;

      const amount = response.amount;
      const tag = response.tag;

      const searchParams = new URLSearchParams();
      searchParams.set("amount", amount);
      searchParams.set("dt", tag);

      const qrValue = `xrpl://${walletAddress}?${searchParams.toString()}`; // not quite sure if this complies, but seems to work in xumm? https://github.com/XRPLF/XRPL-Standards/blob/master/XLS-2d/xls-2d-reference.js

      // output the qr code
      log(
        chalk.bold(
          `\nScan this QR code with your wallet app to ask to receive ` +
            chalk.green(`${amount} XRP`)
        )
      );
      log("Via wallet address: " + chalk.blue(walletAddress));
      log(
        " ".repeat(`Via wallet address: `.length) +
          stringToColorBlocks(walletAddress, network) +
          `${tag ? ` (tag: ${tag})` : ""}`
      );
      log("");
      qrcode.generate(qrValue);
      log("");

      break;
    }
    case "balance": {
      await gatekeep(context);

      let network =
        context.flags.network || context.config.network || "xrpl:testnet";
      if (network === "testnet") {
        network = "xrpl:testnet";
      } else if (network === "livenet") {
        network = "xrpl:livenet";
      }
      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let walletAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        walletAddress = keys[network].address;
      } else {
        walletAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      // input[2] could be {address}, in which case we should fund that address
      // ask for the address
      const response = await prompts([
        {
          type: "text",
          name: "address",
          message: `Enter the address whose balance you want to check: `,
          initial: walletAddress,
        },
      ]);
      if (!response.address) {
        process.exit(1);
      }
      walletAddress = response.address;

      const balancePromise = context.coins.getBalancesXrpl({
        network,
        address: walletAddress,
      });
      const balance = await waitFor(balancePromise, {
        text:
          `Checking balance for ` +
          chalk.blue(`${walletAddress}`) +
          ` on ` +
          chalk.magenta(`${network}\n`) +
          " ".repeat(`Checking balance for   `.length) +
          stringToColorBlocks(walletAddress, network),
      });
      if (balance) {
        log(
          chalk.bold(
            `\nBalance: ` +
              chalk.green(`${balance?.xrp.toLocaleString()} XRP`) +
              ` ~ $` +
              chalk.cyan(`${parseFloat(balance?.usd).toFixed(2)}`)
          )
        );
      } else {
        log(chalk.red(`Balance check failed.`));
      }

      await context.coins.disconnect();

      break;
    }
    case "fund": {
      await gatekeep(context);

      let network =
        context.flags.network || context.config.network || "xrpl:testnet";
      if (network === "testnet") {
        network = "xrpl:testnet";
      } else if (network === "livenet") {
        network = "xrpl:livenet";
      }
      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let walletAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        walletAddress = keys[network].address;
      } else {
        walletAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      // input[2] could be {address}, in which case we should fund that address
      // ask for the address
      const response = await prompts([
        {
          type: "text",
          name: "address",
          message: `Enter the address you want to fund: `,
          initial: walletAddress,
        },
        // confirm are you sure
        {
          type: "confirm",
          name: "ok",
          message: `Are you sure you want to fund this address?`,
          initial: false,
        },
      ]);
      if (!response.address || !response.ok) {
        process.exit(1);
      }
      walletAddress = response.address;

      const faucetPromise = context.coins.fundViaFaucet({
        network,
        address: walletAddress,
      });
      const status = await waitFor(faucetPromise, {
        text:
          `Funding ` +
          chalk.yellow(`${walletAddress}`) +
          ` on ` +
          chalk.magenta(`${network}\n`) +
          " ".repeat(`Funding   `.length) +
          stringToColorBlocks(walletAddress, network),
      });
      if (status) {
        log(
          chalk.bold(`Ok, funded. New balance: `) +
            chalk.green(`${status.balance}`)
        );
      } else {
        log(chalk.red(`Funding failed.`));
      }

      await context.coins.disconnect();

      break;
    }
    case "keys":
      await gatekeep(context);

      if (!context.keys) {
        context.keys = await context.vault.keys();
      }
      log(`keys: ${JSON.stringify(context.keys, null, "  ")}`);
      break;
    case "mnemonic":
      await gatekeep(context);

      // input[2] could be {set}, in which case we should set the mnemonic
      if (context.input[2] === "set") {
        // ask for the mnemonic
        const response = await prompts([
          {
            type: "text",
            name: "mnemonic",
            message: `Enter your mnemonic phrase in one line, separated by spaces: `,
            initial: false,
          },
          // confirm are you sure
          {
            type: "confirm",
            name: "ok",
            message: `Are you sure you want to set this mnemonic?`,
            initial: false,
          },
        ]);
        if (!response.mnemonic || !response.ok) {
          process.exit(1);
        }
        await context.vault.write("mnemonic", response.mnemonic);
      } else {
        // get the mnemonic
        if (!context.flags.yes) {
          // ask if we should print the mnemonic
          const response = await prompts([
            {
              type: "confirm",
              name: "ok",
              message: `Would you like to disclose your mnemonic phrase?`,
              initial: false,
            },
          ]);
          if (!response.ok) {
            process.exit(1);
          }
        }
        log(chalk.bold(context.mnemonic));
      }
      break;
    case "help": {
      help();
      break;
    }
    default:
      if (
        !context.input[1] ||
        context.flags.help ||
        context.input[1] === "help"
      ) {
        help();
      }

      log(chalk.red(`Unknown command: ${context.input[1]}`));
      process.exit(1);
  }
};

export { exec };
