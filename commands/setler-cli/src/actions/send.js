import chalk from "chalk";
import { detectStringTypes } from "../lib/detect.js";
import { expandDid } from "../lib/did.js";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import prompts from "prompts";

const log = console.log;

const help = () => {
  log("");
  log(chalk.bold(`send social: send an escrow transaction`));
  log(
    `send social <address[:weight]> <address[:weight]> ...: send an escrow transaction to the given addresses`
  );
  // log(`send payment: send a payment transaction`);
  // log(`send trust: send a trust transaction`);
  log("");
  log(chalk.bold(`send help: show this help`));
};

const exec = async (context) => {
  switch (context.input[1]) {
    case "social": {
      await gatekeep(context);

      // get addresses from rest of input
      const addresses = context.input.slice(2);
      if (addresses.length === 0) {
        log(chalk.red(`send: no addresses given`));
        help();
        process.exit(1);
      }

      // ask for the amount
      log("");
      const response = await prompts([
        {
          type: "text",
          name: "amount",
          message: `Enter the amount to send in XRP: `,
          initial: false,
        },
      ]);
      if (!response.amount) {
        process.exit(1);
      }

      const amountXrp = parseFloat(response.amount);

      // convert the amount into drops
      const drops = parseFloat(amountXrp) * 1000000;
      log(chalk.gray(`\tAmount in drops: \t${drops.toLocaleString()}`));

      // convert the amount into usd
      const exchangeRate = await getExchangeRate("XRP");
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
      log("");

      const weights = (context.flags.weights || "").split(","); // comma separated list of weights, should match the number of addresses if present, otherwise equal weights of 1 assumed

      // parse the addresses and weights
      let longestLength = 0;
      let weightedAddresses = addresses.map((address, i) => {
        if (address.length > longestLength) {
          longestLength = address.length;
        }

        // get corresponding weight
        const weight = weights[i] ? parseFloat(weights[i]) : 1;
        return {
          address,
          weight,
        };
      });

      // calculate the amount each address gets from the total amountXrp
      const totalWeight = weightedAddresses.reduce((total, address) => {
        return total + address.weight;
      }, 0);

      if (totalWeight === 0) {
        log(chalk.red(`send: total weight is 0`));
        process.exit(1);
      }

      let longestAmountLength = 0;
      let longestPercentLength = 0;
      weightedAddresses = weightedAddresses.map((address) => {
        const amount = (amountXrp * address.weight) / totalWeight;
        // check if amount is less than 0
        if (amount < 0) {
          log(chalk.red(`send: amount is less than 0`));
          process.exit(1);
        }
        if (`${amount}`.length > longestAmountLength) {
          longestAmountLength = `${amount}`.length;
        }
        if (
          parseFloat((address.weight / totalWeight) * 100).toFixed(4).length >
          longestPercentLength
        ) {
          longestPercentLength = parseFloat(
            (address.weight / totalWeight) * 100
          ).toFixed(4).length;
        }
        return {
          address: address.address,
          weight: address.weight,
          amount: amount,
        };
      });

      // confirm the addresses and weights
      weightedAddresses.forEach((address) => {
        log(
          chalk.blue(
            `${address.address}${" ".repeat(
              longestLength - address.address.length
            )}  `
          ) +
            `${" ".repeat(
              longestPercentLength -
                parseFloat((address.weight / totalWeight) * 100).toFixed(4)
                  .length
            )}` +
            chalk.bold(
              `${parseFloat((address.weight / totalWeight) * 100).toFixed(
                4
              )}%  `
            ) +
            `${" ".repeat(
              longestAmountLength - address.amount.toString().length
            )}  ` +
            chalk.greenBright(`${address.amount} XRP`) +
            "  ~  " +
            chalk.cyanBright(
              `$${parseFloat(address.amount * exchangeRate).toFixed(2)}`
            )
        );
      });

      // ask for confirmation
      log("");
      const confirm2 = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Confirm addresses and weights?`,
          initial: false,
        },
      ]);
      if (!confirm2.ok) {
        process.exit(1);
      }

      // confirm the account
      log("");
      const network = context.flags.network || "xrpl:testnet";
      const keys = await context.vault.keys();
      // log(JSON.stringify(keys, null, 2));

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

      const confirm3 = await prompts([
        {
          type: "confirm",
          name: "ok",
          message:
            `Confirm source address: ` +
            chalk.yellow(`${sourceAddress}`) +
            " on network " +
            chalk.magentaBright(`${network}`) +
            " ?",
          initial: false,
        },
      ]);
      if (!confirm3.ok) {
        process.exit(1);
      }

      // see what type of addresses we have, and send accordingly
      // addresses can be an xrpl address, or a did (did:kudos:...) if they're not, we should error

      // loop through addresses and expand if needed
      for (let i = 0; i < weightedAddresses.length; i++) {
        const address = weightedAddresses[i];
        const types = detectStringTypes(address.address);
        if (types.did) {
          // expand this address
          const did = address.address;
          const identResolver =
            context.flags.identResolver ||
            context.config.identity?.identResolver;
          const expanded = await expandDid({
            did,
            identResolver,
            network,
          });
          // loop through expanded see if any are xrpl addresses with our network
          if (context.flags.verbose) {
            log(`send: expanded did ${did} to ${JSON.stringify(expanded)}`);
          }

          if (!expanded) {
            // ask if we should create an escrow payment
            const confirm4 = await prompts([
              {
                type: "confirm",
                name: "ok",
                message: `No xrpl address found for did ${did}, create escrow payment via ${identResolver}?`,
                initial: false,
              },
            ]);
            if (!confirm4.ok) {
              log(
                chalk.red(
                  `send: could not expand did ${did}. Remove from list and try again.`
                )
              );
              process.exit(1);
            }
            // mark this address as an escrow
            weightedAddresses[i].escrow = true;
          }
          weightedAddresses[i].expandedAddress = expanded;
        } else if (types.xrpl) {
          weightedAddresses[i].expandedAddress = address.address;
        } else {
          log(chalk.red(`send: unknown address type ${address.address}`));
          process.exit(1);
        }
      }

      // see how much we have in this account, to verify it's enough to cover the transaction?
      const accountInfo = await context.coins.getAccountInfo({
        network,
        sourceAddress,
      });
      const balance = accountInfo?.xrpDrops;
      if (!balance) {
        log(chalk.red(`send: could not get balance for ${sourceAddress}`), {
          balance,
          accountInfo,
        });
        process.exit(1);
      }
      const balanceXrp = parseFloat(balance) / 1000000;
      if (balanceXrp < amountXrp) {
        log(
          chalk.red(
            `send: not enough balance in ${sourceAddress} to send ${amountXrp} XRP`
          )
        );
        process.exit(1);
      }
      log(`send: ${sourceAddress} has ${balanceXrp} XRP`);
      log(
        `send: sending to ${addresses.length} addresses: ${addresses.join(
          ", "
        )}`
      );

      context.coins.disconnect();
      break;
    }
    case "help": {
      help();
      break;
    }
    default: {
      log(`send: unknown subcommand ${context.input[1] || ""}`);
      help();
      break;
    }
  }
};

export { exec };
