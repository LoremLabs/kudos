import { UnsecuredJWT } from "jose";
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
import { convertStringToHex } from "xrpl";
import { getSubjectSubdomain } from "../lib/ident-agency.js";

const log = console.log;

const exec = async (context) => {
  switch (context.input[1]) {
    case "delegate": {
      // generate a jwt token for api access
      // TODO: this is a mess because the jose eddsa would not verify properly?? The signature is embedded in the payload and an empty signature jwt part because alg=none...
      // TODO: fixme

      await gatekeep(context);
      const network = context.flags.network || "kudos";

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

      // pin to list of poolIds
      let poolIds = context.flags.poolIds || "";

      if (!(poolIds && poolIds.length)) {
        const result = await prompts({
          type: "text",
          name: "poolMatch",
          message:
            "Which pool match (name or id) should the token be valid for? (comma separated list). Use * for wildcard name match.",
          initial: "*",
        });
        poolIds = result.poolMatch;
      }
      if (poolIds) {
        // split with , and remove whitespace
        poolIds = poolIds.split(",").map((id) => id.trim());
      }

      // add a p: prefix to each poolId to indicate it is a poolId
      // make sure it doesn't already have the prefix

      poolIds = poolIds.map((id) => {
        if (id && !id.startsWith("i:")) {
          return "i:" + id;
        }
        return id;
      });

      // filter out any empty strings
      poolIds = poolIds.filter((id) => id);

      poolIds = [...new Set(poolIds)];

      payload.s = poolIds; // s = scope
      if (context.debug) {
        log({ payload });
      }
      const message = JSON.stringify(payload);

      // sign the payload
      const { signature, recId } = await context.vault.sign({
        message,
        signingKey: privateKey,
      });

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
        log("Address     : " + sourceAddress);
        log(" ".repeat(14) + stringToColorBlocks(sourceAddress, network));
        log("");
      }
      log(`KUDOS_STORAGE_TOKEN="${unsecuredJwt}"`);

      break;
    }
    case "login": {
      // this is similar to ns set, but does not allow .domains or hostnames

      await gatekeep(context);
      const network =
        context.flags.network || context.config.network || "xrpl:testnet";

      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let sourceAddress;
      // let privateKey, publicKey;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
        // privateKey = keys[network].privateKey;
        // publicKey = keys[network].publicKey;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
        // privateKey = keys[networkParts[0]][networkParts[1]].privateKey;
        // publicKey = keys[networkParts[0]][networkParts[1]].publicKey;
      }

      const domain = context.flags.domain || "ident.cash";

      let record = [];
      // what type of record is this?
      // the subject is authorized to make changes to the sub-tree
      let dnsType = "TXT";
      let dnsValue = sourceAddress;

      let dnsTtl = context.flags.ttl || 60;
      let dnsPath = `$s.${domain}`;

      if (!dnsPath || !dnsType || !dnsValue || !dnsTtl) {
        process.exit(1);
      }

      if (dnsType === "TXT") {
        dnsValue = `"${dnsValue}"`;
      }

      // validate the path
      const pathParts = dnsPath.split(".");
      // make sure the path contains $subject
      if (!pathParts.includes("$s")) {
        log(
          chalk.red(
            `Invalid path: ${dnsPath}. Must include $s. Example: testnet.$s.ident.cash`
          )
        );
        process.exit(1);
      }

      record = [dnsPath, dnsType, dnsValue];
      if (dnsTtl !== 60 && dnsTtl) {
        record.push(dnsTtl);
      }

      if (context.debug) {
        log(chalk.magenta(JSON.stringify(record)));
      }

      // get our subject
      let subject = context.input[2] || context.flags.subject;
      let subjectType;
      if (subject) {
        // set subjectType from the first part of the subject (email, twitter, phone, etc) from email:
        const subjectTopType = subject.split(":")[0];
        if (subjectTopType === "kudos") {
          subjectType = subject.split(":")[2];
        } else {
          subjectType = subjectTopType;
        }

        if (!subjectType) {
          log(chalk.red(`send: invalid subject: ${subject}`));
          process.exit(1);
        }
      } else {
        // construct a subject by asking some questions:
        // 1) email, twitter, phone, etc
        log("");
        let initial = 0;
        if (context.flags.email) {
          initial = 0;
        } else if (context.flags.twitter) {
          initial = 1;
        } else if (context.flags.github) {
          initial = 2;
        }

        const response = await prompts([
          {
            message: "What subject is responsible for this path?",
            type: "select",
            name: "subjectType",
            choices: [
              {
                title: "email",
                description: "An email address",
                value: "email",
              },
              // {
              //   title: "twitter",
              //   value: "twitter",
              //   disabled: false,
              //   description: "Your Twitter username.",
              // },
              // {
              //   title: "github",
              //   value: "github",
              //   description: "Your GitHub handle.",
              // },
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
            initial:
              context.flags.email && context.flags.email !== true
                ? context.flags.email
                : "",
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
            initial:
              context.flags.twitter && context.flags.twitter !== true
                ? context.flags.twitter
                : "",
            message:
              "Twitter Handle? " + chalk.grey(`(example: @loremlabs)`) + " ?",
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
            initial:
              context.flags.github && context.flags.github !== true
                ? context.flags.github
                : "",
            message:
              "Github Handle? " + chalk.grey(`(example: @loremlabs)`) + " ?",
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
        ]);

        subjectType = response.subjectType;
        if (!subjectType) {
          process.exit(1);
        }
        switch (subjectType) {
          case "email": {
            subject = `email:${response.email}`;
            break;
          }
          case "twitter": {
            const twitterHandle = response.twitter
              .replace("@", "")
              .toLowerCase()
              .trim();
            subject = `twitter:${twitterHandle}`;
            break;
          }
          case "github": {
            const githubHandle = response.github
              .replace("@", "")
              .toLowerCase()
              .trim();
            subject = `github:${githubHandle}`;
            break;
          }
          default: {
            process.exit(1);
          }
        }
      }

      let data = {};
      if (context.debug) {
        log(chalk.magenta(JSON.stringify({ subject, subjectType })));
      }
      switch (subjectType) {
        case "email": {
          // logging in with subject message
          log("");
          log(`Logging in with ${chalk.blue(subject)}...`);

          const nonce =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

          const email = subject.split(":")[1];

          const authPromise = context.auth.startEmailAuth({
            email,
            nonce,
            network,
          });
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
            record,
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

          break;
        }
        case "github":
        case "twitter": {
          log("");
          log(`Starting authorization for ${chalk.blue(subject)}...`);

          const authPromise = context.auth.startAuth({ subject, network });
          const authStart = await waitFor(authPromise, {
            text: `Getting authorization...`,
          });

          log({ authStart });

          if (authStart.status.code !== 200) {
            if (context.debug) {
              log({ authStart });
            }
            log(chalk.red("Error starting authorization."));
            process.exit(1);
          }

          log("");
          if (authStart.out.open) {
            log(`Opening ${chalk.blue(authStart.out.open)}...`);
            sysOpen(authStart.out.open);
          } else {
            log(chalk.red("Error starting authorization."));
            process.exit(1);
          }

          let timeout;
          try {
            if (!context.flags.noTimeout) {
              timeout = setTimeout(() => {
                log(chalk.red("Timed out waiting for authorization."));
                throw new Error("timed out");
              }, 1000 * 60 * 5);
            }

            const authMsgRaw = await waitFor(authStart.oAuthDone, {
              text: `Confirming authentication...`,
            });
            if (authMsgRaw.msg) {
              data = JSON.parse(authMsgRaw.msg);
            }
          } catch (e) {
            if (e.error) {
              log(chalk.red(e.error));
              process.exit(1);
            }
          }
          clearTimeout(timeout);

          log("");
          log(
            `You have successfully authenticated with ${chalk.blue(subject)}.`
          );
          // log({data});

          break;
        }
        default: {
          process.exit(1);
        }
      }

      // if we're here, we've successfully logged in, and have a signature from the server saying so
      // we now ask if the user wants to publish this subject to the XRPL, with meta data

      log({ data });

      log("");
      log(
        `You have successfully associated your ${subjectType} with your XRPL account.`
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
      // send the transaction 777
      // const sendPromise = context.coins.sendDirectoryPayment({
      //   network,
      //   sourceAddress,
      //   address: data.mapping.address,
      //   amount: amountXrp,
      //   amountDrops: drops,
      //   tag: data.mapping.tag || 0,
      //   credentials: [
      //     {
      //       type: "s2s", // send-to-social
      //       mapping: data["credential-map"],
      //       signature: data.signature,
      //       issuer: data.mapping["credential-issuer"] || "s2s", // TODO
      //     },
      //   ],
      // });

      // setup memos:
      const Memos = [];
      // Enter memo data to insert into a transaction
      const MemoData = convertStringToHex(
        JSON.stringify(data.auth)
      ).toUpperCase();
      const MemoType = convertStringToHex("ia").toUpperCase();
      const MemoFormat = convertStringToHex("ia/v1").toUpperCase();
      Memos.push({
        Memo: {
          MemoType,
          MemoFormat,
          MemoData,
        },
      });

      if (context.debug) {
        log(chalk.magenta("memo length: " + MemoData.length));
      }

      const sendPromise = context.coins.send({
        network,
        sourceAddress,
        address: data.mapping.address,
        amount: amountXrp,
        amountDrops: drops,
        tag: data.mapping.tag || 0,
        memos: Memos,
      });

      const send = await waitFor(sendPromise, {
        text: `Creating directory entry...`,
      });
      log(send);
      log("");
      log(
        chalk.green(
          `🚀 Registered ${dnsPath} with the directory service. This should be active in the next 5 minutes.`
        )
      );

      // show the dig command to look up the record
      log("");

      const subjHash = await getSubjectSubdomain(subject);
      // create the dns record from the template, record[0], substituting $s with part1.part2
      const fullHost = dnsPath
        .replace("$s", `${network.replace(":", "-")}.${subjHash}`)
        .toLowerCase()
        .trim();

      // show the dig command to look up the record:
      log(
        chalk.gray(
          `To look up the record, run: ` +
            chalk.yellow(`% dig ${fullHost} -t ${dnsType}`)
        )
      );

      log("");

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
      if (context.input[1] && context.input[1] !== "help") {
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
