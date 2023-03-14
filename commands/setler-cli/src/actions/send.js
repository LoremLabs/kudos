import { format as ago } from "timeago.js";
import chalk from "chalk";
import { detectStringTypes } from "../lib/detect.js";
import { expandDid } from "../lib/did.js";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import ora from "ora";
import prompts from "prompts";
import spinners from "cli-spinners";
import { stringToColorBlocks } from "../lib/colorize.js";
import windowSize from "window-size";
import { xrpToDrops } from "xrpl";

const log = console.log;

const waitFor = (promise, options) => {
  // await waitFor(promise, { text: 'Loading unicorns', spinner: spinners.dots });

  const spinner = ora({
    text: "Processing...",
    spinner: spinners.earth,
    ...options,
  });
  spinner.start();
  promise.then(
    () => {
      spinner.succeed();
    },
    () => {
      spinner.fail();
    }
  );
  return promise;
};

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

      const network = context.flags.network || "xrpl:testnet";
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
      if (
        !response.amount ||
        parseFloat(response.amount).toString() === "NaN"
      ) {
        process.exit(1);
      }

      const amountXrp = parseFloat(response.amount); // takes care of scientific notation?

      // convert the amount into drops
      const drops = parseFloat(amountXrp) * 1000000;
      log(chalk.gray(`\tAmount in drops: \t${drops.toLocaleString()}`));

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
        chalk.gray(
          `\tEstimated fees : \t${estimatedFees * addresses.length} XRP`
        )
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
      let totalWeight = 0;
      let longestAmountLength = 0;
      let longestPercentLength = 0;
      let changedWeights = false;

      let totalFeeEstimate = estimatedFees * weightedAddresses.length; // total fee estimate for all addresses
      let totalFeeEstimateDrops = xrpToDrops(totalFeeEstimate); // bignumber?

      let totalDropsBeforeFees = drops - totalFeeEstimateDrops;
      let totalXrpBeforeFees = totalDropsBeforeFees / 1000000;

      // log('drops', drops, 'minus fees', totalFeeEstimateDrops, 'equals', drops - totalFeeEstimateDrops);

      const calcWeights = () => {
        totalWeight = 0;
        totalWeight = weightedAddresses.reduce((total, address) => {
          return total + address.weight;
        }, 0);

        if (totalWeight === 0) {
          log(chalk.red(`send: total weight is 0`));
          process.exit(1);
        }

        weightedAddresses = weightedAddresses.map((address) => {
          const amount = (totalXrpBeforeFees * address.weight) / totalWeight;
          const amountDrops = Math.round(
            (totalDropsBeforeFees * address.weight) / totalWeight
          ); // TODO: validate the drops usage is correct
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
            ...address,
            // address: address.address,
            // weight: address.weight,
            amount: amount.toFixed(6),
            amountDrops: amountDrops,
          };
        });
      };
      calcWeights();

      const confirmWeights = async () => {
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
      };

      await confirmWeights();

      // confirm the account
      log("");
      log(
        `Source address: ` +
          chalk.yellow(`${sourceAddress}`) +
          "\n                " +
          stringToColorBlocks(sourceAddress) +
          "\n\nNetwork:        " +
          chalk.magentaBright(`${network}`)
      );
      log("");

      const confirm3 = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Addresses and network Ok?`,
          initial: false,
        },
      ]);
      if (!confirm3.ok) {
        process.exit(1);
      }

      // see what type of addresses we have, and send accordingly
      // addresses can be an xrpl address, or a did (did:kudos:...) if they're not, we should error
      log("");

      // loop through addresses and expand if needed
      for (let i = 0; i < weightedAddresses.length; i++) {
        const address = weightedAddresses[i];
        const types = detectStringTypes(address.address); // is this a did, xrpl address, etc
        if (context.flags.verbose) {
          log(`Detected types ${JSON.stringify(types)}`);
        }
        if (types.did) {
          // expand this address
          const did = address.address;
          const identResolver =
            context.flags.identResolver ||
            context.config.identity?.identResolver;

          let directPaymentVia, escrowMethod;
          try {
            // this throws so we have a red x
            const expandPromise = expandDid({
              did,
              identResolver,
              network,
            });

            const response = await waitFor(expandPromise, {
              text: `Looking up address for ` + chalk.blue(`${did}`),
            });

            directPaymentVia = response.directPaymentVia;
            escrowMethod = response.escrowMethod;
          } catch (e) {
            if (e.message !== "Escrow only") {
              log(chalk.red(`Error expanding did ${did}: ${e.message}`));
              process.exit(1);
            }
            // no payment methods found
            directPaymentVia = e.extra.directPaymentVia;
            escrowMethod = e.extra.escrowMethod;
          }

          // loop through expanded see if any are xrpl addresses with our network
          if (context.flags.verbose) {
            log(
              chalk.gray(
                `Expanded did ${did} to ${JSON.stringify({
                  directPaymentVia,
                  escrowMethod,
                })}`
              )
            );
          }

          if (!directPaymentVia && escrowMethod) {
            // ask if we should create an escrow payment
            log("");
            log(`No xrpl address found for did ` + chalk.blue(`${did}`) + `.`);
            log(
              `Escrow payment available via: ` +
                chalk.yellow(`${escrowMethod.address} `) +
                "\n                              " +
                stringToColorBlocks(escrowMethod.address)
            );
            if (escrowMethod.time) {
              log("");
              log(
                `Escrow payment expires:       ` +
                  chalk.cyan(
                    `${ago(new Date(Date.now() + escrowMethod.time * 1000))}`
                  )
              );
              if (escrowMethod.onExpiration === "snowball") {
                log(
                  chalk.gray(
                    "=> Unclaimed funds will be redistributed via the "
                  ) +
                    " snowball " +
                    chalk.gray("method.")
                );
              } else {
                // the default
                log(
                  chalk.gray(
                    "=> After this time, the payment will be returned to the sender."
                  )
                );
              }

              if (escrowMethod.terms) {
                log(
                  chalk.gray(
                    "=> Sending via escrow implies agreeing to the terms:\n   "
                  ) + chalk.cyan(escrowMethod.terms)
                );
              }
            }
            log("");
            const confirm4 = await prompts([
              {
                type: "confirm",
                name: "ok",
                message: "Create escrow payment? ",
                initial: false,
              },
            ]);
            if (!confirm4.ok) {
              log(
                chalk.red(
                  `send: Could not expand did ${did}. Remove from list and try again.`
                )
              );
              process.exit(1);
            }
            // mark this address as an escrow
            weightedAddresses[i].escrow = { identifier: did, ...escrowMethod };
            weightedAddresses[i].expandedAddress = escrowMethod.address;
            if (context.flags.verbose) {
              log(chalk.magenta(JSON.stringify(escrowMethod, null, 2)));
            }
          } else if (!directPaymentVia) {
            log(
              chalk.red(
                `send: Could not expand did ${did}. Remove from list and try again.`
              )
            );
            process.exit(1);
          } else {
            weightedAddresses[i].expandedAddress = directPaymentVia;
          }
        } else if (types.accountAddress) {
          weightedAddresses[i].expandedAddress = address.address;
        } else {
          log(chalk.red(`\nsend: unknown address type ${address.address}`));
          process.exit(1);
        }

        // skip this if the destination is equal to the source
        if (weightedAddresses[i].expandedAddress === sourceAddress) {
          changedWeights = true;
          log(
            chalk.red(
              `send: Removing entry for address ${sourceAddress}. Won't send to self.`
            )
          );
          weightedAddresses[i].weight = 0;
          continue;
        }
      }

      // we should recalculate the weights, as we may have removed some addresses
      if (changedWeights) {
        log("");
        calcWeights();
        await confirmWeights();
      }

      // see how much we have in this account, to verify it's enough to cover the transaction?
      log("");
      log(chalk.bold(`Using network: `) + chalk.magentaBright(`${network}`));
      log("");

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
              stringToColorBlocks(sourceAddress)
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

      const { width } = windowSize.get();
      log(" " + "─".repeat(width - 2));
      // we should do the direct transfers first, then the escrow transfers
      // log(JSON.stringify(weightedAddresses, null, 2));

      // last confirmation
      if (!context.flags.yes) {
        const confirm2 = await prompts([
          {
            type: "text",
            name: "doit",
            message:
              `Type: ` + chalk.red("send it") + ` to initiate transfer: `,
            initial: false,
          },
        ]);
        if (confirm2.doit !== "send it") {
          log(chalk.red(`send: aborting`));
          process.exit(1);
        }
      }

      log("");
      // send direct payments
      let directSent = 0;
      for (let i = 0; i < weightedAddresses.length; i++) {
        let currentAddress = weightedAddresses[i];
        if (currentAddress.weight === 0) {
          continue;
        }
        if (currentAddress.escrow) {
          continue;
        }
        // log(chalk.yellow(JSON.stringify(currentAddress, null, 2)));
        // log(
        //   `Sending ` +
        //     chalk.green(`${currentAddress.amount}`) +
        //     ` to ` +
        //     chalk.blue(`${currentAddress.expandedAddress}`)
        // );
        const dpPromise = context.coins.send({
          network,
          sourceAddress,
          address: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          tag: currentAddress.tag,
        });

        const directPayment = await waitFor(dpPromise, {
          text:
            `Sending ` +
            chalk.green(`${currentAddress.amount}`) +
            " to " +
            chalk.blue(`${currentAddress.expandedAddress}`) +
            " " +
            stringToColorBlocks(currentAddress.expandedAddress),
        });

        if (!directPayment) {
          log(
            chalk.red(
              `send: could not send this direct payment. Check transaction history before trying again.`
            )
          );
          process.exit(1);
        }
        directSent++;
      }

      if (directSent) {
        log("");
        log(
          chalk.bold(
            chalk.green(`✔`) + ` Ok, direct payments sent successfully.`
          )
        );
        log("");
      }

      // log(chalk.bold(`send: Sending escrow payments`));

      // send escrow payments
      for (let i = 0; i < weightedAddresses.length; i++) {
        let currentAddress = weightedAddresses[i];
        if (currentAddress.weight === 0) {
          continue;
        }
        if (!currentAddress.escrow) {
          continue;
        }
        // log(JSON.stringify(currentAddress.escrow));
        // log(
        //   `Sending ` +
        //     chalk.green(`${currentAddress.amount}`) +
        //     ` to ` +
        //     chalk.blue(`${currentAddress.expandedAddress} as escrow`)
        // );

        const epPromise = context.coins.sendEscrow({
          network,
          sourceAddress,
          address: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          escrow: currentAddress.escrow,
        });
        const { result, fulfillmentTicket } = await waitFor(epPromise, {
          text:
            `Creating Escrow of ` +
            chalk.green(`${currentAddress.amount}`) +
            " via " +
            chalk.blue(`${currentAddress.expandedAddress}`),
        });

        if (!result && !fulfillmentTicket) {
          log(chalk.red(`send: could not send escrow payment`));
          process.exit(1);
        }

        // log(JSON.stringify(result, null, 2));

        // TODO: post it to ident agency, don't treat transaction as complete until we get a response
        log(JSON.stringify(fulfillmentTicket, null, 2));
      }

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
