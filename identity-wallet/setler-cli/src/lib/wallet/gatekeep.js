import { DEFAULTS, initConfig } from "../config.js";

import { AuthAgent } from "../auth-agent.js";
import { Coins } from "../coins.js";
import { Vault } from "../vault.js";
import bcrypt from "bcrypt";
import chalk from "chalk";
import crypto from "node:crypto";
import { decryptAES } from "./decryptSeedAES.js";
import { encryptAES } from "./encryptSeedAES.js";
import envPaths from "env-paths";
import fs from "fs";
import { generateMnemonic } from "./generateMnemonic.js";
import keytar from "keytar";
import prompts from "prompts";

const log = console.log;

export const setupContext = async (context) => {
  context.config = context.config || initConfig();

  context.vault = new Vault({ context });
  context.coins = new Coins({ context });
  context.auth = new AuthAgent({ context });
};

export const gatekeep = async (
  context,
  shouldCreate,
  opts = { networks: ["xrpl:testnet", "xrpl:livenet"] }
) => {
  // check to see if we have a config file and load it
  context.config = initConfig();
  context.config.auth = context.config.auth || {};

  let profile = context.flags.profile || process.env.SETLER_PROFILE || 0; // this is the branch in the HD wallet, default to 0
  context.profile = profile;
  context.passPhrase =
    context.flags.passPhrase || process.env.SETLER_PASSPHRASE || "";

  context.debug = context.flags.debug || process.env.SETLER_DEBUG || false;
  if (context.debug) {
    log(chalk.magenta(`Debug: ${context.debug}`));
  }

  // see if the networks chosen require stricter security
  // if networks in only "kudos" then we can use a less secure method
  // if networks in "xrpl" then we need to use a more secure method
  const secureMode = opts.networks.some((n) => n.includes("xrpl"));

  // set the context.config.auth if there's an env var
  if (process.env.KUDOS_STORAGE_TOKEN) {
    context.config.auth[`KUDOS_STORAGE_TOKEN`] =
      process.env.KUDOS_STORAGE_TOKEN;
  }

  // set the auth keys if there's an env var
  // this lets us get the auth keys from context.config.auth[`SETLER_KEYS_${profile}`] or process.env[`KUDOS_STORAGE_TOKEN`]
  if (process.env[`SETLER_KEYS_${profile}`]) {
    context.config.auth[`SETLER_KEYS_${profile}`] =
      process.env[`SETLER_KEYS_${profile}`];
  }

  let wallet = context.flags.wallet || process.env.SETLER_WALLET || 0; // changing the wallet will generate a new mnemonic and hd wallet
  wallet = parseInt(wallet, 10);
  context.wallet = `${wallet}`;

  context.poolEndpoint =
    context.flags.poolEndpoint ||
    process.env.SETLER_POOL_ENDPOINT ||
    context.config.auth?.SETLER_POOL_ENDPOINT ||
    DEFAULTS.POOL_ENDPOINT;

  if (context.flags.verbose) {
    log(chalk.green(`Wallet: ${wallet}`));
  }
  //   // add a : to the end of wallet if it's not already there to make the code easier
  //   if (wallet.length && wallet.slice(-1) !== ":") {
  //     wallet = `${wallet}:`;
  //   }

  // see if we have a pw as a flag or process.env
  let userPw = context.flags.password || process.env.SETLER_PASSWORD; // TODO: not a good idea?
  if (context.flags.noPassword) {
    // always a password, but use this one as a default
    userPw = "password";
  }
  const envKey =
    context.config.auth[
      `SETLER_KEYS_${
        parseInt(context.wallet, 10) ? context.wallet + "_" : ""
      }${profile}`
    ];

  const hasEnvKey = envKey ? true : false;

  const checkConfig = async () => {
    // unlock the vault
    let hash = await keytar.getPassword(
      "Setler",
      `${wallet ? wallet : ""}pass`
    );
    if (!hash) {
      if (!shouldCreate) {
        log(chalk.red(`No password found. Try wallet init`));
        process.exit(1);
      }

      if (userPw) {
        const bcrypted = await bcrypt.hash(userPw, 12);
        await keytar.setPassword(
          "Setler",
          `${wallet ? wallet : ""}pass`,
          bcrypted
        );
        hash = await keytar.getPassword(
          "Setler",
          `${wallet ? wallet : ""}pass`
        );
      } else {
        // prompt to set one
        const response = await prompts([
          {
            type: "confirm",
            name: "ok",
            message: `A password is required to continue. Set wallet ${parseInt(
              wallet,
              10
            )}'s password?`,
            initial: false,
          },
        ]);
        if (!response.ok) {
          process.exit(1);
        } else {
          // set a password
          const response = await prompts([
            {
              type: "password",
              name: "password",
              message: `Setler Password: `,
              initial: false,
            },
            {
              type: "password",
              name: "password2",
              message: `Confirm Password: `,
              initial: false,
            },
          ]);

          if (
            response &&
            response.password &&
            response.password === response.password2
          ) {
            const bcrypted = await bcrypt.hash(response.password, 12);
            userPw = response.password;
            await keytar.setPassword(
              "Setler",
              `${wallet ? wallet : ""}pass`,
              bcrypted
            );
            log(chalk.green(`Password set`));
            hash = await keytar.getPassword(
              "Setler",
              `${wallet ? wallet : ""}pass`
            );
          } else if (response.password !== response.password2) {
            log(chalk.red(`Passwords do not match`));
            process.exit(1);
          }
        }
      }
    }

    if (!hash) {
      log(chalk.red(`Password required`));
      process.exit(1);
    }

    if (!userPw) {
      const response = await prompts([
        {
          type: "password",
          name: "password",
          message: `Setler Password: `,
          initial: false,
        },
      ]);
      if (response && response.password) {
        userPw = response.password;
      }
      //console.log(JSON.stringify(response, null, '  '));
    }

    const result = await bcrypt.compare(userPw, hash);

    // if password is invalid, we should stop.
    if (!result) {
      log(chalk.red(`Invalid password`));
      process.exit(1);
    }

    // if password is valid, we should continue, reading the salt
    let salt = await keytar.getPassword(
      "Setler",
      `${wallet ? wallet : ""}salt`
    );
    if (!salt && !shouldCreate) {
      log(chalk.red(`No salt found`));
      process.exit(1);
    } else if (!salt && shouldCreate) {
      // if we are a new user, we should set a salt
      // salt = generate 32 bytes of random data, then hex encode them
      // and store them in the keychain

      const randomBytes = await crypto.webcrypto.getRandomValues(
        new Uint8Array(32)
      );
      salt = Buffer.from(randomBytes).toString("hex");

      await keytar.setPassword("Setler", `${wallet ? wallet : ""}salt`, salt);
      // log(chalk.green(`Salt set for ${user} ${salt}`));
    }

    // if we have a salt, we should continue
    context.salt = salt;

    // read in mneumonic
    const configDir = envPaths("setler", {
      suffix: "",
    }).data;
    // log(`Looking for: ${JSON.stringify(envPaths("setler"))}`);
    const seedFile = `${configDir}/state/setlr-${wallet}.seed`;
    if (context.debug) {
      log(chalk.gray(`Looking for seed file: ${seedFile}`));
    }
    const createSeed = async () => {
      if (!shouldCreate) {
        log(chalk.red(`No seed found for ${wallet}`));
        process.exit(1);
      }
      // ask user if we should create it.
      const response = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Would you like to create a mnemonic for Wallet: ${wallet}?`,
          initial: false,
        },
      ]);
      if (!response.ok) {
        process.exit(1);
      }

      // create a seed
      const mnemonic = generateMnemonic();

      // check if it exists, if so, confirm overwrite
      if (fs.existsSync(seedFile)) {
        const response = await prompts([
          {
            type: "confirm",
            name: "ok",
            message: `Mnemonic already exists for Wallet: ${wallet}. Overwrite?`,
            initial: false,
          },
        ]);
        if (!response.ok) {
          process.exit(1);
        }
        // otherwise let's make a backup...although the salt would need to be the same too
        const backupFile = `${seedFile}-${Date.now()}.bak`;
        fs.copyFileSync(seedFile, backupFile);
      }

      const seedDir = `${configDir}/state/`;
      if (!fs.existsSync(seedDir)) {
        fs.mkdirSync(seedDir, { recursive: true });
      }

      // write seed file
      const encrypted = encryptAES(mnemonic, salt);
      fs.writeFileSync(seedFile, encrypted, "utf8");

      return mnemonic;
    };

    let mnemonic = "";
    if (context.debug) {
      log(chalk.gray(`Looking for seed file: ${seedFile}`));
    }
    if (fs.existsSync(seedFile)) {
      const data = fs.readFileSync(seedFile, "utf8");
      // log(`Seed found for ${profile}: ${data} salt: ${salt}`);
      if (data) {
        // we'll read it in and decrypt it.
        mnemonic = decryptAES(data, salt);
        if (!mnemonic) {
          log(chalk.red(`Unable to decrypt seed for Profile ${profile}`));
          process.exit(1);
        }
        // log(`Seed found for ${profile}: ${mnemonic}`);
      } else {
        mnemonic = await createSeed();
      }
    } else {
      mnemonic = await createSeed();
    }

    // if we have a mneumonic, we should continue
    context.mnemonic = mnemonic;
  };

  if (hasEnvKey && shouldCreate) {
    log(
      chalk.red(
        `Cannot create a new wallet with an env key. unset ${`SETLER_KEYS_${profile}`} ${envKey}? to continue`
      )
    );
    process.exit(1);
  }

  if (secureMode) {
    // log(chalk.yellow(`--secure mode--`));
    if (!hasEnvKey) {
      // log(chalk.yellow(`--no env key--`));
      await checkConfig();
    } else if (!context.flags.skipLocalConfig) {
      // read in salt without user input
      let salt = await keytar.getPassword(
        "Setler",
        `${wallet ? wallet : ""}salt`
      );
      if (salt) {
        // read in mneumonic, but without user input
        const configDir = envPaths("setler", {
          suffix: "",
        }).data;
        const seedFile = `${configDir}/state/setlr-${wallet}.seed`;
        if (context.debug) {
          log(chalk.gray(`Looking for seed file: ${seedFile}`));
        }
        if (fs.existsSync(seedFile)) {
          const data = fs.readFileSync(seedFile, "utf8");
          if (data) {
            // we'll read it in and decrypt it.
            const mnemonic = decryptAES(data, salt);
            if (!mnemonic) {
              log(chalk.red(`Unable to decrypt seed for Profile ${profile}`));
              process.exit(1);
            }
            // log(`Seed found for ${profile}: ${mnemonic}`);
            context.mnemonic = mnemonic;
          }
        }
      }
    }
  } else {
    if (context.debug) {
      log(chalk.yellow(`--non-secure mode--`));
    }
  }

  setupContext(context);
};
