import chalk from "chalk";
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
      const amountUsd = amountXrp * exchangeRate;
      log(chalk.gray(`\tAmount in usd  : \t$${amountUsd}`));

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

      // parse the addresses and weights
      let longestLength = 0;
      let weightedAddresses = addresses.map((address) => {
        const parts = address.split(":");
        if (parts[0].length > longestLength) {
          longestLength = parts[0].length;
        }
        return {
          address: parts[0],
          weight: parts[1] ? parseFloat(parts[1]) : 1,
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
            chalk.cyanBright(`$${address.amount * exchangeRate}`)
        );
      });

      // ask for confirmation
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

      log(
        `send: sending to ${addresses.length} addresses: ${addresses.join(
          ", "
        )}`
      );
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
