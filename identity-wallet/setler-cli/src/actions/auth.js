import { UnsecuredJWT } from "jose";
import { format as ago } from "timeago.js";
import chalk from "chalk";
// import fetch from "node-fetch";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import prompts from "prompts";
// import jsonColorize from "json-colorizer";
import { stringToColorBlocks } from "../lib/colorize.js";
import sysOpen from "open";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";

const log = console.log;

const exec = async (context) => {
  switch (context.input[1]) {
    case "delegate": {
      // generate a jwt token for api access
      // TODO: this is a mess because the jose eddsa would not verify properly?? The signature is embedded in the payload and an empty signature jwt part because alg=none...
      // TODO: fixme

      await gatekeep(context);
      const network = context.flags.network || "xrpl:testnet";

      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let sourceAddress;
      let privateKey, publicKey;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
        privateKey = keys[network].privateKey;
        publicKey = keys[network].publicKey;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
        privateKey = keys[networkParts[0]][networkParts[1]].privateKey;
        publicKey = keys[networkParts[0]][networkParts[1]].publicKey;
      }
      // remove 00 from privateKey
      privateKey = privateKey.slice(2);
      // console.log({ privateKey, publicKey });

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      const payload = {};
      payload.a = sourceAddress;
      payload.n = [network];

      // prompt for various access methods: {kudos:store, kudos:read, kudos:summary}
      const result = await prompts({
        type: "multiselect",
        name: "value",
        message: "What access would you like to delegate?",
        choices: [
          { title: "Store Kudos", value: "kudos:store", selected: true },
          { title: "Read Kudos", value: "kudos:read" },
          { title: "Read Kudos Summary", value: "kudos:summary" },
        ],
        hint: "- Space to select. Return to submit",
      });

      payload.t = [...result.value];
      // console.log({payload});
      const message = JSON.stringify(payload);

      // sign the payload
      const { signature, recId } = await context.vault.sign({
        message,
        signingKey: privateKey,
      });
      // console.log({signature, recId});

      // create a base64 token from the payload
      // const token = Buffer.from(JSON.stringify(payload)).toString("base64");
      // console.log({token});

      // ask user how long they want the keys to be valid for (in days)
      let days = parseInt(context.flags.days, 10);

      if (!days) {
        const result = await prompts({
          type: "number",
          name: "days",
          message: "How many days should the token be valid for?",
          initial: 180,
        });
        days = result.days;
      }

      const unsecuredJwt = new UnsecuredJWT({
        p: message,
        s: `${signature}${recId}`,
      })
        .setIssuedAt()
        .setIssuer("setler-cli")
        .setExpirationTime(`${days}d`)
        .encode();

      // console.log({unsecuredJwt});
      const payload2 = UnsecuredJWT.decode(unsecuredJwt, {});

      // console.log(payload2);

      // const sig = signature.slice(0, -1);
      // const recId = parseInt(signature.slice(-1), 10);

      // verify the payload
      const verified = await context.vault.verifyMessage({
        message: payload2.payload.p,
        signature, //: payload2.payload.s,
        keys: { publicKey },
      });
      if (!verified) {
        log(chalk.red(`send: unable to verify signature`));
        process.exit(1);
      }

      // console.log({verified});
      if (!context.flags.quiet) {
        log("");
        log(chalk.green(`Access Token:`));
        log("");
      }
      log(`KUDOS_STORAGE_TOKEN="${unsecuredJwt}"`);

      break;
    }
    case "login": {
      await gatekeep(context);

      // are we currently logged in? that would be in the config?

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
            did = `did:kudos:twitter:${response.twitter}`;
            break;
          }
          default: {
            process.exit(1);
          }
        }
      }

      // logging in with did message
      log("");
      log(`Logging in with ${chalk.blue(did)}...`);

      const authPromise = context.auth.startAuth({ did, network });
      const authStart = await waitFor(authPromise, {
        text: `Getting authorization...`,
      });

      log("");
      log(
        `You will receive an email with a code. Enter that code below to complete the login process.`
      );
      log("");

      // if we're here, the backend should have sent us an email, so we wait for it, and ask
      // the user to enter the code they received
      const authCode = await prompts({
        type: "text",
        name: "code",
        instructions: "Example: ABCD-EFGH",
        message: "Access code:",
      });

      if (!authCode.code) {
        process.exit(1);
      }

      // log({authStart});
      let data = {};
      try {
        data = JSON.parse(authStart.response?.out);
      } catch (e) {
        log(chalk.red("Error parsing response from server."));
        process.exit(1);
      }

      // see if our nonce matches
      if (data.nonce !== authStart.nonce) {
        log(chalk.red("Nonce mismatch."));
        process.exit(1);
      }

      // we have the code, so we can finish the auth process
      const verifyAuthCodePromise = context.auth.verifyAuthCode({
        rid: data.rid,
        code: authCode.code,
        nonce: authStart.nonce,
        network,
      });
      const verifyAuthCode = await waitFor(verifyAuthCodePromise, {
        text: `Verifying code...`,
      });

      log(verifyAuthCode);
      try {
        data = JSON.parse(verifyAuthCode.response?.out);
      } catch (e) {
        log(chalk.red("Error parsing response from server."));
        process.exit(1);
      }

      // if we're here, we've successfully logged in, and have a signature from the server saying so
      // we now ask if the user wants to publish this DID to the XRPL, with meta data

      log("");
      log(
        `You have successfully associated your ${didType} with your XRPL account.`
      );
      log(
        chalk.gray(`\tThis will expire in: \t`) +
          chalk.cyan(`${ago(new Date(Date.now() + 86400 * 7 * 1000))}`)
      );

      log("");
      log(
        `You can persist this mapping for ` +
          chalk.cyan(
            `${ago(new Date(Date.now() + data.mapping.expiration * 1000))}`
          ) +
          ` by using a lookup directory.`
      );
      if (data.mapping.terms) {
        log("");
        log(
          `The directory lookup service is provided according to the terms at`
        );
        log(chalk.grey(data.mapping.terms));
      }
      log("");
      log(
        "Directory address: " +
          chalk.yellow(
            `${data.mapping.address}\n` +
              " ".repeat("Directory address: ".length) +
              stringToColorBlocks(data.mapping.address, network)
          )
      );

      const amountXrp = data.mapping.costXrp.toFixed(1);
      log(chalk.bold(`\tDirectory cost : \t${amountXrp} XRP`));

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
        text: `Getting directory costs`,
      });
      log(chalk.gray(`\tTransaction fee: \t${estimatedFees} XRP`));

      // convert the amount into usd
      const getExchange = getExchangeRate("XRP");
      const exchangeRate = await waitFor(getExchange, {
        text: "Fetching current exchange rate",
      });

      const amountUsd = parseFloat(amountXrp * exchangeRate).toFixed(2);
      log(chalk.gray(`\tAmount in usd  : \t$${amountUsd}\n`));

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

      // send the transaction
      const sendPromise = context.coins.sendDirectoryPayment({
        network,
        sourceAddress,
        address: data.mapping.address,
        amount: amountXrp,
        amountDrops: drops,
        tag: data.mapping.tag || 0,
        credentials: [
          {
            type: "s2s", // send-to-social
            mapping: data["credential-map"],
            signature: data.signature,
            issuer: data.mapping["credential-issuer"] || "s2s", // TODO
          },
        ],
      });
      const send = await waitFor(sendPromise, {
        text: `Creating directory entry...`,
      });
      log(send);
      log("");
      log(
        chalk.green(`🚀 Registered your ${didType} with the directory service.`)
      );
      log(`Transaction: ` + chalk.yellow(`${send.result.hash}\n`));

      // see if the user wants to open in the transaction explorer
      // https://testnet.xrpl.org/transactions/B85E8884B5485B841F7CE65C7C3A6D4E9844E142C3A279DFA50095DF4989EF77/detailed
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
        const url = `https://${xrplNetwork}.xrpl.org/transactions/${send.result.hash}/detailed`;
        sysOpen(url);
      }

      context.coins.disconnect();
      break;
    }
    default: {
      if (context.input[1]) {
        log(chalk.red(`Unknown command: ${context.input[1]}`));
      }
      log("");
      log("Usage: setler auth [command]");
      log("");
      log("commands: { login, delegate }");

      break;
    }
  }
};

export { exec };
