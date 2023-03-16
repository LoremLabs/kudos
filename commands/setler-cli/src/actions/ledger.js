import chalk from "chalk";
// import fetch from "node-fetch";

const log = console.log;

const exec = async (context) => {
  switch (context.input[1]) {
    // case "get": {
    //   const network = context.flags.network || "xrpl:testnet";
    //   const limit = context.flags.limit || 10;

    //   const account = context.input[2];
    //   if (!account) {
    //     log(chalk.red(`Please provide an account address`));
    //     process.exit(1);
    //   }

    //   const endpoint =
    //     network === "xrpl:testnet"
    //       ? "https://testnet-rpc.xrpl-labs.com"
    //       : "https://xrplcluster.com";

    //   if (context.flags.verbose) {
    //     log(`network: ${network}`);
    //     log(`endpoint: ${endpoint}`);
    //   }

    //   const command = {
    //     method: "account_tx",
    //     params: [{ account: account, limit: limit }],
    //   };

    //   const call = await fetch(endpoint, {
    //     method: "POST",
    //     body: JSON.stringify(command),
    //   });

    //   const data = await call.json();
    //   log(data);
    //   break;
    // }
    default: {
      log(chalk.red(`Unknown command: ${context.input[1]}`));
      break;
    }
  }
};

export { exec };
