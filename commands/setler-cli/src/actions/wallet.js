import bcrypt from "bcrypt";
import chalk from "chalk";
import keytar from "keytar";
import prompts from "prompts";

const log = console.log;

// should exit if password is invalid
const gatekeep = async (context) => {
  let user = context.flags.user || process.env.SETLER_USER || process.env.USER; // whoami

  // see if we have a pw as a flag or process.env
  let userPw = context.flags.password || process.env.SETLER_PW; // TODO: not a good idea?

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
};

const exec = async (context) => {
  await gatekeep(context);
};

export { exec };
