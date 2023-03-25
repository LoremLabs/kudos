import chalk from "chalk";
// import fetch from "node-fetch";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import jsonColorize from "json-colorizer";
import prompts from "prompts";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";

const log = console.log;

const exec = async (context) => {
  switch (context.input[1]) {
    case "login": {
      await gatekeep(context);

      // are we currently logged in? that would be in the config?

      const network = context.flags.network || "xrpl:testnet";

      let did = context.input[2];
      if (!did) {
        // construct a did by asking some questions:
        // 1) email, twitter, phone, etc
        log("");
        const response = await prompts([
          {
            message: "What type of identifier do you want to login with?",
            type: "select",
            name: "didType",
            choices: [
              {
                title: "email",
                description: "Your email address",
                value: "email",
              },
              {
                title: "twitter",
                value: "twitter",
                disabled: true,
                description: "Your Twitter username.",
              },
              {
                title: "phone",
                value: "phone",
                disabled: true,
                description: "Your phone number.",
              },
            ],
            initial: 0,
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
            validate: (maybeHandle) => {
              // allow empty to skip
              if (maybeHandle === "") {
                return true;
              }

              // does this seem like a twitter handle?
              const checkRegex = /^@[a-zA-Z0-9_]{1,15}$/;
              return checkRegex.test(maybeHandle);
            },
          },
        ]);
        const didType = response.didType;
        if (!didType) {
          process.exit(1);
        }
        switch (didType) {
          case "email": {
            did = `did:kudos:email:${response.email}`;
            break;
          }
          case "twitter": {
            did = `did:kudos:twitter:${response.twitter}`;
            break;
          }
          default: {
            process.exit(1);
          }
        }

        // logging in with did message
        log("");
        log(`Logging in with ${chalk.blue(did)}...`);

        const authPromise = context.auth.startAuth({ did });
        const authStart = await waitFor(authPromise, {
          text: `Initiating authorization...`,
        });
      }

      break;
    }
    default: {
      if (context.input[1]) {
        log(chalk.red(`Unknown command: ${context.input[1]}`));
      }
      log("");
      log("Usage: setler auth [command]");
      log("");
      log("commands: { login }");

      break;
    }
  }
};

export { exec };
