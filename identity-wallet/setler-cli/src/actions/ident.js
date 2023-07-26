import chalk from "chalk";
import { expandDid } from "../lib/did.js";
// import fetch from "node-fetch";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import prompts from "prompts";
// import jsonColorize from "json-colorizer";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";

const log = console.log;

const help = () => {
  log("Usage: setler ident [subcommand] [options]");
  log("");
  log("Subcommands:");
  log("  lookup");
  log("");
  log("Examples:");
  log("  setler ident lookup [did:kudos:email:...]");
  log("  setler ident lookup");
  log("");

  process.exit(1);
};

const exec = async (context) => {
  switch (context.input[1]) {
    case "lookup": {
      await gatekeep(context, true);

      let identResolver =
        context.flags.identResolver || context.config.identity?.identResolver;
      // TODO: fix this hack
      identResolver = identResolver.trim();
      if (identResolver.endsWith("/")) {
        identResolver = identResolver.slice(0, -1);
      }

      if (!identResolver) {
        log(chalk.red("ident: no identResolver configured"));
        process.exit(1);
      }

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

      let did = context.input[2];
      let didType;
      if (did) {
        // set didType from the first part of the did (email, twitter, phone, etc) from did:kudos:email:
        const didTopType = did.split(":")[1];
        if (didTopType === "kudos") {
          didType = did.split(":")[2];
        } else {
          didType = didTopType;
        }

        if (!didType || did.indexOf("did:") !== 0) {
          log(chalk.red(`send: invalid did: ${did}`));
          process.exit(1);
        }
      } else {
        // construct a did by asking some questions:
        // 1) email, twitter, phone, etc
        log("");
        let initial = 0;
        if (context.flags.email) {
          initial = 0;
        }
        if (context.flags.twitter) {
          initial = 1;
        }
        if (context.flags.github) {
          initial = 2;
        }

        const response = await prompts([
          {
            message: "What type of identifier do you want to lookup?",
            type: "select",
            name: "didType",
            choices: [
              {
                title: "email",
                description: "Email address",
                value: "email",
              },
              {
                title: "twitter",
                value: "twitter",
                description: "Twitter username.",
              },
              {
                title: "github",
                value: "github",
                description: "Github handle.",
              },
              {
                title: "did",
                value: "did",
                description: "DID (decentralized identifier).",
              },
            ],
            initial,
          },
          {
            type: (prev) => {
              const type = prev === "email" ? "text" : null;
              return type;
            },
            name: "email",
            message:
              "Email address? " +
              chalk.grey(`(example: email@domain.com)`) +
              " ?",
            initial: context.flags.email || "",
            validate: (maybeEmail) => {
              // allow empty to skip
              if (maybeEmail === "") {
                return true;
              }

              // does this seem like an email?
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(maybeEmail);
            },
          },
          {
            type: (prev) => {
              const type = prev === "twitter" ? "text" : null;
              return type;
            },
            name: "twitter",
            message:
              "Twitter Screen name? " +
              chalk.grey(`(example: @loremlabs)`) +
              " ?",
            initial: context.flags.twitter || "",
            validate: (maybeHandle) => {
              // allow empty to skip
              if (maybeHandle === "") {
                return true;
              }

              // does this seem like a twitter handle?
              const checkRegex = /^@?[a-zA-Z0-9_]{1,15}$/;
              return checkRegex.test(maybeHandle);
            },
          },
          {
            type: (prev) => {
              const type = prev === "github" ? "text" : null;
              return type;
            },
            name: "github",
            message:
              "Github handle? " + chalk.grey(`(example: @loremlabs)`) + " ?",
            validate: (maybeHandle) => {
              // allow empty to skip
              if (maybeHandle === "") {
                return true;
              }

              // does this seem like a github handle?
              const checkRegex = /^@?[a-zA-Z0-9_]{1,39}$/;
              return checkRegex.test(maybeHandle);
            },
          },
          {
            type: (prev) => {
              const type = prev === "did" ? "text" : null;
              return type;
            },
            name: "did",
            message:
              "DID ? " +
              chalk.grey(`(example: did:kudos:email:matt@example.com)`) +
              " ?",
            validate: (maybeHandle) => {
              // does this seem like a did?
              const checkRegex = /^did:/;
              return checkRegex.test(maybeHandle);
            },
          },
        ]);

        didType = response.didType;
        if (!didType) {
          process.exit(1);
        }
        switch (didType) {
          case "email": {
            did = `did:kudos:email:${response.email}`;
            break;
          }
          case "twitter": {
            let handle = response.twitter.toLowerCase().trim();
            if (handle.startsWith("@")) {
              handle = handle.slice(1);
            }
            did = `did:kudos:twitter:${handle}`;
            break;
          }
          case "github": {
            let handle = response.github.toLowerCase().trim();
            if (handle.startsWith("@")) {
              handle = handle.slice(1);
            }
            did = `did:kudos:github:${handle}`;
            break;
          }
          case "did": {
            did = response.did.toLowerCase().trim();
            break;
          }
          default: {
            process.exit(1);
          }
        }
      }

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
        if (response.directPaymentVia) {
          log(`${did} = ` + chalk.yellow(`${response.directPaymentVia}`));
          log(
            " ".repeat(`${did} = `.length) +
              stringToColorBlocks(response.directPaymentVia, network)
          );
        }

        if (response.escrowMethod) {
          log(`${did} = ` + chalk.yellow(`${response.escrowMethod}`));
        }

        // directPaymentVia = response.directPaymentVia;
        // escrowMethod = response.escrowMethod;
      } catch (e) {
        log(`No payment address found for ${did}`);
        // no payment methods found
        // directPaymentVia = e.extra.directPaymentVia;
        // escrowMethod = e.extra.escrowMethod;

        if (e.extra.escrowMethod) {
          log(`${did} = ` + chalk.yellow(`${e.extra.escrowMethod}`));
        }
        if (e.extra.kudosLogConfig) {
          log(`Kudos Log would write ${did} = ` + chalk.yellow(`${e.extra.kudosLogConfig?.identifier}`));
        }
      }

      break;
    }
    default: {
      if (context.input[1] && context.input[1] !== "help") {
        log(chalk.red(`Unknown command: ${context.input[1]}`));
      }
      help();

      break;
    }
  }
};

export { exec };
