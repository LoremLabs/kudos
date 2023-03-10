import bcrypt from "bcrypt";
import chalk from "chalk";
import crypto from "node:crypto";
import { decryptAES } from "../lib/wallet/decryptSeedAES.js";
import envPaths from "env-paths";
import fs from "fs";
import { generateMnemonic } from "../lib/wallet/generateMnemonic.js";
import keytar from "keytar";
import prompts from "prompts";

const log = console.log;

// should exit if password is invalid
const gatekeep = async (context) => {
  let profile = context.flags.profile || process.env.SETLER_PROFILE || 0;

  let user = context.flags.user || process.env.SETLER_USER || process.env.USER; // whoami

  // see if we have a pw as a flag or process.env
  let userPw = context.flags.password || process.env.SETLER_PW; // TODO: not a good idea?

  let isNewUser = false;

  // unlock the vault
  let hash = await keytar.getPassword("Setler", `${user}:pass`);
  if (!hash) {
    log(chalk.red(`No password found for ${user}`));

    // prompt to set one
    const response = await prompts([
      {
        type: "confirm",
        name: "ok",
        message: `Would you like to set a password for ${user}?`,
        initial: false,
      },
    ]);
    if (!response.ok) {
      process.exit(1);
    } else {
      // set a password
      isNewUser = true;
      const response = await prompts([
        {
          type: "password",
          name: "password",
          message: `Setler Password: `,
          initial: false,
        },
      ]);
      if (response && response.password) {
        const bcrypted = await bcrypt.hash(response.password, 12);
        await keytar.setPassword("Setler", `${user}:pass`, bcrypted);
        log(chalk.green(`Password set for ${user}`));
        hash = await keytar.getPassword("Setler", `${user}:pass`);
      }
    }
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
  let salt = await keytar.getPassword("Setler", `salt`); // TODO: should scope?
  if (!salt && !isNewUser) {
    log(chalk.red(`No salt found for ${user}`));
    process.exit(1);
  } else if (!salt && isNewUser) {
    // if we are a new user, we should set a salt
    // salt = generate 32 bytes of random data, then hex encode them
    // and store them in the keychain

    const randomBytes = await crypto.getRandomValues(new Uint8Array(32));
    salt = Buffer.from(randomBytes).toString("hex");

    await keytar.setPassword("Setler", `${user}`, salt);
    // log(chalk.green(`Salt set for ${user} ${salt}`));
  }

  // if we have a salt, we should continue
  // read in mneumonic
  const configDir = envPaths("setler", {
    suffix: "",
  }).data;
  // log(`Looking for: ${JSON.stringify(envPaths("setler"))}`);
  const seedFile = `${configDir}/state/setlr-${profile}.seed`;

  const createSeed = async () => {
    log(chalk.red(`No seed found for ${profile}`));
    // ask user if we should create it.
    const response = await prompts([
      {
        type: "confirm",
        name: "ok",
        message: `Would you like to create a seed for Profile ${profile}?`,
        initial: false,
      },
    ]);
    if (!response.ok) {
      process.exit(1);
    }

    // create a seed
    const mnemonic = generateMnemonic();
    log(`Seed created for ${profile}: ${mnemonic}`);
  };

  log(`Looking for seed file: ${seedFile}`);
  if (fs.existsSync(seedFile)) {
    const data = fs.readFileSync(seedFile, "utf8");
    log(`Seed found for ${profile}: ${data} salt: ${salt}`);
    if (data) {
      // we'll read it in and decrypt it.
      const mnemonic = decryptAES(data, salt);
      if (!mnemonic) {
        log(chalk.red(`Unable to decrypt seed for Profile ${profile}`));
        process.exit(1);
      }
      log(`Seed found for ${profile}: ${mnemonic}`);
    } else {
      await createSeed();
    }
  } else {
    await createSeed();
  }
};

const exec = async (context) => {
  await gatekeep(context);
};

export { exec };
