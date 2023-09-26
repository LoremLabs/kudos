import {
  DEFAULTS,
  getEndpoint,
  initConfig,
  setEndpoint,
  writeConfig,
} from "../lib/config.js";

import chalk from "chalk";
import prompts from "prompts";

const log = console.log;

const exec = async (context) => {
  let config = initConfig();

  // switch based on the subcommand
  switch (context.input[1]) {
    case "get": {
      log(`config: ${JSON.stringify(config, null, "  ")}`);
      break;
    }
    case "endpoint": {
      if (context.input[2] === "get") {
        let network = context.input[3];
        // ask for network if not given

        if (!network) {
          const response = await prompts([
            {
              type: "text",
              name: "network",
              message: `Enter the network: `,
              initial: "xrpl:testnet",
            },
          ]);
          if (!response.network) {
            process.exit(1);
          }
          network = response.network;
        }

        const endpoint = await getEndpoint(network, config);
        log(`${endpoint}`);
      } else if (context.input[2] === "set") {
        let network = context.input[3];
        let endpoint = context.input[4];

        if (!network || !endpoint) {
          // prompt for network and endpoint

          const response = await prompts([
            {
              type: "text",
              name: "network",
              message: `Enter the network: `,
              initial: network,
            },
            {
              type: "text",
              name: "endpoint",
              message: `Enter the endpoint: `,
              initial: endpoint || DEFAULTS.ENDPOINTS[network],
            },
          ]);
          if (!response.network) {
            // empty endpoint means return to defaults
            process.exit(1);
          }
          network = response.network;
          endpoint = response.endpoint || DEFAULTS.ENDPOINTS[network];
        }
        setEndpoint(network, endpoint, config);
        log(chalk.green(`endpoint for ${network} set to ${endpoint}`));
      }
      break;
    }
    case "auth": {
      // setler config auth set
      // KUDOS_STORAGE_TOKEN="e..."
      // SETLER_KEYS_0="e..."
      config.auth = config.auth || {};

      let wallet = context.flags.wallet || process.env.SETLER_WALLET || 0; // changing the wallet will generate a new mnemonic and hd wallet
      wallet = parseInt(wallet, 10);
      context.wallet = `${wallet}`;

      if (context.input[2] === "get") {
        const profile = context.profile || 0;
        const keys =
          config.auth?.[
            `SETLER_KEYS_${
              parseInt(context.wallet, 10) ? context.wallet + "_" : ""
            }${profile}`
          ] ||
          process.env[
            `SETLER_KEYS_${
              parseInt(context.wallet, 10) ? context.wallet + "_" : ""
            }${profile}`
          ];

        log(`SETLER_KEYS_${profile}="${keys}"`);

        const token =
          config.auth?.[`KUDOS_STORAGE_TOKEN`] ||
          process.env[`KUDOS_STORAGE_TOKEN`];

        log(`KUDOS_STORAGE_TOKEN="${token}"`);
      } else if (context.input[2] === "set") {
        // we can set either keys or token
        if (context.input[3] === "keys") {
          const profile = context.profile || 0;
          const token = context.input[4] || context.flags.token;

          if (!token) {
            // prompt for token
            const response = await prompts([
              {
                type: "text",
                name: "token",
                message: `Enter SETLER_KEYS_${
                  parseInt(context.wallet, 10) ? context.wallet + "_" : ""
                }${profile}: `,
                initial:
                  process.env[
                    `SETLER_KEYS_${
                      parseInt(context.wallet, 10) ? context.wallet + "_" : ""
                    }${profile}`
                  ] ||
                  config.auth?.[
                    `SETLER_KEYS_${
                      parseInt(context.wallet, 10) ? context.wallet + "_" : ""
                    }${profile}`
                  ],
              },
            ]);
            if (!response.token) {
              process.exit(1);
            }
            config.auth[
              `SETLER_KEYS_${
                parseInt(context.wallet, 10) ? context.wallet + "_" : ""
              }${profile}`
            ] = response.token;
          } else {
            config.auth[
              `SETLER_KEYS_${
                parseInt(context.wallet, 10) ? context.wallet + "_" : ""
              }${profile}`
            ] = token;
          }

          // write
          writeConfig(config);

          log(chalk.green(`token for profile ${profile} set`));
        } else if (context.input[3] === "token") {
          const profile = context.profile || 0;
          const token = context.input[4] || context.flags.token;

          if (!token) {
            // prompt for token
            const response = await prompts([
              {
                type: "text",
                name: "token",
                message: `Enter the token: `,
                initial:
                  process.env[`KUDOS_STORAGE_TOKEN`] ||
                  config.auth?.[`KUDOS_STORAGE_TOKEN`],
              },
            ]);
            if (!response.token) {
              process.exit(1);
            }
            config.auth[`KUDOS_STORAGE_TOKEN`] = response.token;
          } else {
            config.auth[`KUDOS_STORAGE_TOKEN`] = token;
          }

          // write
          writeConfig(config);

          log(chalk.green(`token for profile ${profile} set`));
        } else {
          // usage
          log(
            chalk.bold(`Usage: setler config auth set [keys|token] --profile 0`)
          );
        }
      } else {
        // usage
        log(chalk.bold(`Usage: setler config auth [get|set] --profile 0`));
      }

      break;
    }
    case "ident": {
      if (context.input[2] === "resolver") {
        let action = context.input[3];
        if (action === "get") {
          log(config.identity?.identResolver || DEFAULTS.IDENTITY.RESOLVER);
        } else if (action === "set") {
          let resolver = context.input[4];
          if (!resolver) {
            // prompt for resolver
            const response = await prompts([
              {
                // confirm should we do this
                type: "confirm",
                name: "ok",
                message: `Are you sure you want to set the resolver?`,
                initial: false,
              },
              {
                type: "text",
                name: "resolver",
                message: `Enter the resolver: `,
                initial:
                  config.identity?.identResolver || DEFAULTS.IDENTITY.RESOLVER,
              },
            ]);
            if (!response.ok) {
              process.exit(1);
            }

            resolver = response.resolver || DEFAULTS.IDENTITY.RESOLVER;
          }
          config.identity.identResolver = resolver;

          log(chalk.green(`resolver set to ${resolver}`));
          // write
          writeConfig(config);
          break;
        } else {
          // usage
          log(chalk.bold(`Usage: setler config ident resolver [get|set]`));
          break;
        }
      } else {
        // usage
        log(chalk.bold(`Usage: setler config ident [resolver]`));
        break;
      }
      break;
    }
    case "network": {
      if (context.input[2] === "get") {
        log(config.network || DEFAULTS.NETWORK);
      } else if (context.input[2] === "set") {
        let network = context.input[3] || context.flags.network || "";
        network = network.trim().toLowerCase();
        if (!network) {
          // prompt for network
          const response = await prompts([
            {
              type: "text",
              name: "network",
              message: `Enter the network: `,
              initial: config.network || DEFAULTS.NETWORK,
            },
          ]);

          network = response.network || config.network || DEFAULTS.NETWORK;
        }

        const response = await prompts([
          {
            // confirm should we do this
            type: "confirm",
            name: "ok",
            message: `Update the default network to ${chalk.cyan(network)} ?`,
            initial: false,
          },
        ]);
        if (!response.ok) {
          process.exit(1);
        }
        config.network = network;
        await writeConfig(config);
      }

      break;
    }
    default: {
      // usage
      log(chalk.bold(`Usage: setler config [get|endpoint|ident|auth|network]`));

      // example
      log(chalk.bold(`Example: setler config network set`));
      break;
    }
  }
};

export { exec };
