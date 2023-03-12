import { Vault } from "../vault.js";
import bcrypt from "bcrypt";
import chalk from "chalk";
import crypto from "node:crypto";
import { decryptAES } from "./decryptSeedAES.js";
import { encryptAES } from "./encryptSeedAES.js";
import envPaths from "env-paths";
import fs from "fs";
import { generateMnemonic } from "./generateMnemonic.js";
import { initConfig } from "../config.js";
import keytar from "keytar";
import prompts from "prompts";

const log = console.log;

export const gatekeep = async (context, shouldCreate) => {
  // check to see if we have a config file and load it
  context.config = initConfig();

  let profile = context.flags.profile || process.env.SETLER_PROFILE || 0; // this is the branch in the HD wallet, default to 0
  context.profile = profile;
  context.passPhrase =
    context.flags.passPhrase || process.env.SETLER_PASSPHRASE || "";

  let scope = context.flags.scope || process.env.SETLER_SCOPE || 0; // changing the scope will generate a new mnemonic and hd wallet
  scope = parseInt(scope, 10);
  context.scope = `${scope}`;

  if (context.flags.verbose) {
    log(chalk.green(`Scope: ${scope}`));
  }
  //   // add a : to the end of scope if it's not already there to make the code easier
  //   if (scope.length && scope.slice(-1) !== ":") {
  //     scope = `${scope}:`;
  //   }

  // see if we have a pw as a flag or process.env
  let userPw = context.flags.password || process.env.SETLER_PASSWORD; // TODO: not a good idea?

  // unlock the vault
  let hash = await keytar.getPassword("Setler", `${scope ? scope : ""}pass`);
  if (!hash) {
    if (!shouldCreate) {
      log(chalk.red(`No password found. Try wallet init`));
      process.exit(1);
    }

    // prompt to set one
    const response = await prompts([
      {
        type: "confirm",
        name: "ok",
        message: `A password is required to continue. Set ${scope} password?`,
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
        await keytar.setPassword(
          "Setler",
          `${scope ? scope : ""}pass`,
          bcrypted
        );
        log(chalk.green(`Password set`));
        hash = await keytar.getPassword("Setler", `${scope ? scope : ""}pass`);
      } else if (response.password !== response.password2) {
        log(chalk.red(`Passwords do not match`));
        process.exit(1);
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
  let salt = await keytar.getPassword("Setler", `${scope ? scope : ""}salt`);
  if (!salt && !shouldCreate) {
    log(chalk.red(`No salt found`));
    process.exit(1);
  } else if (!salt && shouldCreate) {
    // if we are a new user, we should set a salt
    // salt = generate 32 bytes of random data, then hex encode them
    // and store them in the keychain

    const randomBytes = await crypto.getRandomValues(new Uint8Array(32));
    salt = Buffer.from(randomBytes).toString("hex");

    await keytar.setPassword("Setler", `${scope ? scope : ""}salt`, salt);
    // log(chalk.green(`Salt set for ${user} ${salt}`));
  }

  // if we have a salt, we should continue
  context.salt = salt;

  // read in mneumonic
  const configDir = envPaths("setler", {
    suffix: "",
  }).data;
  // log(`Looking for: ${JSON.stringify(envPaths("setler"))}`);
  const seedFile = `${configDir}/state/setlr-${scope}.seed`;

  const createSeed = async () => {
    if (!shouldCreate) {
      log(chalk.red(`No seed found for ${scope}`));
      process.exit(1);
    }
    // ask user if we should create it.
    const response = await prompts([
      {
        type: "confirm",
        name: "ok",
        message: `Would you like to create a mnemonic for Scope: ${scope}?`,
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
          message: `Mnemonic already exists for Scope: ${scope}. Overwrite?`,
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
    // write seed file
    const encrypted = encryptAES(mnemonic, salt);
    fs.writeFileSync(seedFile, encrypted, "utf8");

    return mnemonic;
  };

  let mnemonic = "";
  // log(`Looking for seed file: ${seedFile}`);
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

  context.vault = new Vault({ context });
};
