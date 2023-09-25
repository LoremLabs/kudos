import chalk from "chalk";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
import qrcode from "qrcode-terminal";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";
import { xrpToDrops } from "xrpl";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import windowSize from "window-size";
import sysOpen from "open";

const log = console.log;

export const help = () => {
  // give help with available subcommands and flags
  log("Usage: setler wallet [command] [options]");
  log("");
  log("Commands:");
  log("  init");
  log("  keys [env] [--filter]");
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
  log("  setler wallet keys env --filter kudos --profile 1 --scope 5");
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
      if (!context.flags.quiet) {
        log(chalk.green(`Wallet initialized`));
      }
      break;
    case "send": {
      await gatekeep(context);

      let network =
        context.flags.network || context.config.network || "xrpl:testnet";
      if (network === "testnet") {
        network = "xrpl:testnet";
      }
      const keys = await context.vault.keys();
      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      // show the user the address we're sending from
      log(
        chalk.bold(
          `\nSending from: ` +
            chalk.blue(
              `${sourceAddress}\n` +
                " ".repeat("sending from: ".length) +
                stringToColorBlocks(sourceAddress, network)
            )
        )
      );
      log("");

      // input[2] could be {address}, in which case we send to that address
      // ask for the address
      let destinationAddress = context.flags.destination || context.input[2];
      if (!destinationAddress) {
        const response = await prompts([
          {
            type: "text",
            name: "address",
            message: `Enter the address you want to send to: `,
            initial: false,
          },
        ]);
        if (!response.address) {
          process.exit(1);
        }
        destinationAddress = response.address;
      }

      // show the user the address we're sending from
      log(
        chalk.bold(
          `\nSending to: ` +
            chalk.yellow(
              `${destinationAddress}\n` +
                " ".repeat("sending to: ".length) +
                stringToColorBlocks(destinationAddress, network)
            )
        )
      );
      log("");

      // ask for the amount
      let amount = context.flags.amount || context.input[3];
      if (!amount) {
        const response = await prompts([
          {
            type: "text",
            name: "amount",
            message: `Enter the amount you want to send (in XRP): `,
            initial: amount || "0.0001",
          },
        ]);
        if (!response.amount) {
          process.exit(1);
        }
        amount = response.amount;
      }
      const amountXrp = amount;
      const drops = xrpToDrops(amountXrp);

      // ask for the tag
      let tag = context.flags.tag;
      if (!tag) {
        const response = await prompts([
          {
            type: "text",
            name: "tag",
            message: `Enter the destination tag for this transaction, or leave blank: `,
            initial: false,
          },
        ]);
        tag = response.tag;
      }

      // estimate the fees
      const estPromise = context.coins.estimatedSendFee({
        network,
        sourceAddress, // estimate
        address: sourceAddress, // estimate
        amount: amountXrp,
        amountDrops: drops,
      });

      const estimatedFees = await waitFor(estPromise, {
        text: `Estimating fees`,
      });
      log(
        chalk.gray(`\tEstimated fees : \t${(estimatedFees * 1).toFixed(6)} XRP`)
      );

      // convert the amount into usd
      const getExchange = getExchangeRate("XRP");
      const exchangeRate = await waitFor(getExchange, {
        text: "Fetching current exchange rate",
      });

      const amountUsd = parseFloat(amountXrp * exchangeRate).toFixed(2);
      log(chalk.gray(`\tAmount in usd  : \t$${amountUsd}\n`));

      // confirm
      const confirm = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Confirm amount to send: ${amountXrp} XRP?`,
          initial: false,
        },
      ]);
      if (!confirm.ok) {
        process.exit(1);
      }
      const getAcctPromise = context.coins.getAccountInfo({
        network,
        sourceAddress,
      });

      const accountInfo = await waitFor(getAcctPromise, {
        text:
          `Getting account balance for: ` +
          chalk.yellow(
            `${sourceAddress}\n` +
              "                               " +
              stringToColorBlocks(sourceAddress, network)
          ),
      });
      const balance = accountInfo?.xrpDrops;
      if (!balance) {
        log(chalk.red(`send: Could not get balance for ${sourceAddress}`), {
          balance,
          accountInfo,
        });
        process.exit(1);
      }
      const balanceXrp = parseFloat(balance) / 1000000;
      if (balanceXrp < amountXrp) {
        log(
          chalk.red(
            `send: Not enough funds in ${sourceAddress} to send ${amountXrp} XRP`
          )
        );
        process.exit(1);
      }
      log("");
      log(
        `Balance after sending ` +
          chalk.green(`${amountXrp} XRP`) +
          ` will be ` +
          chalk.green(`${balanceXrp - amountXrp} XRP`)
      );
      log("");

      log("");
      const { width } = windowSize.get();
      log(" " + "─".repeat(width - 2));
      log("");

      const confirm2 = await prompts([
        {
          type: "text",
          name: "doit",
          message: `Type: ` + chalk.red("send it") + ` to initiate transfer: `,
          initial: false,
        },
      ]);
      if (confirm2.doit !== "send it") {
        log(chalk.red(`send: aborting`));
        process.exit(1);
      }

      const sendPromise = context.coins.send({
        network,
        sourceAddress,
        address: destinationAddress,
        amount: amountXrp,
        amountDrops: drops,
        tag,
      });
      const status = await waitFor(sendPromise, {
        text:
          `Sending ` +
          chalk.green(`${amount} XRP`) +
          ` to ` +
          chalk.blue(`${destinationAddress}`) +
          ` on ` +
          chalk.magenta(`${network}\n`) +
          " ".repeat(
            (`Sending ` + chalk.green(`${amount} XRP`) + ` to `).length
          ) +
          "\n",
      });

      if (status) {
        if (context.debug) {
          log(chalk.magenta(JSON.stringify(status, null, "  ")));
        }
        log(chalk.bold(`Ok, sent.`));
      } else {
        log(chalk.red(`Send failed.`));
      }

      const { open } = await prompts([
        {
          type: "confirm",
          name: "open",
          message: `Open in explorer?`,
          initial: true,
        },
      ]);

      if (open) {
        const xrplNetwork = network === "xrpl:livenet" ? "xrpl" : "testnet";
        const url = `https://${xrplNetwork}.xrpl.org/transactions/${status.result.hash}/detailed`;
        sysOpen(url);
      }

      await context.coins.disconnect();

      break;
    }
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

      if (network === "xrpl:livenet") {
        log(
          chalk.red(
            `To fund this wallet you will need to transfer XRP to the address: ` +
              chalk.blue(`${walletAddress}`) +
              ` on ` +
              chalk.magenta(`${network}\n`) +
              " ".repeat(
                `To fund this wallet you will need to transfer XRP to the address: `
                  .length
              ) +
              stringToColorBlocks(walletAddress, network)
          )
        );
        process.exit(1);
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
    case "keys": {
      await gatekeep(context);
      if (!context.keys) {
        context.keys = await context.vault.keys();
      }

      const filter = context.flags.filter;

      let filteredKeys = {};
      // filteredKeys should only be the matching object if filter is set.
      if (filter) {
        if (filter.indexOf(":") !== -1) {
          // support xrpl:testnet style filter
          const [type, subtype] = filter.split(":");
          filteredKeys[type] = {};
          filteredKeys[type][subtype] = context.keys[type][subtype];
        } else {
          filteredKeys[filter] = context.keys[filter];
        }

        filteredKeys.id = context.keys.id;
      } else {
        filteredKeys = context.keys;
      }

      if (context.input[2] === "env") {
        // display env var version of key
        const envKey = `SETLER_KEYS_${parseInt(context.profile, 10)}`;
        // encodedKeys should be Base64Url encoded JSON of filteredKeys
        const encodedKeys = JSON.stringify(filteredKeys);
        const encodedKeysBase64 =
          Buffer.from(encodedKeys).toString("base64url");
        log(`${envKey}=${encodedKeysBase64}`);
      } else {
        log(`keys: ${JSON.stringify(filteredKeys, null, "  ")}`);
      }
      break;
    }
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
        if (!context.mnemonic) {
          log(chalk.red(`No mnemonic found.`));
          process.exit(1);
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
