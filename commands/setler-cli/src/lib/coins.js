import { DEFAULTS } from "./config.js";
import xrpl from "xrpl";

const log = console.log;

// wrapper for crypto related things
export const Coins = function ({ context }) {
  this.context = context;

  this.clients = {}; // cache of clients
};

Coins.prototype.getConfig = async function (network, type) {
  // get configuration from config
  // get the endpoint

  if (type === "endpoint") {
    // ugh
    switch (network) {
      case "xrpl:livenet":
        return (
          this.context.config?.advEndpoints?.xrplLiveNetEndpoint ||
          DEFAULTS.ENDPOINTS[network]
        );
      case "xrpl:testnet":
        return (
          this.context.config?.advEndpoints?.xrplTestNetEndpoint ||
          DEFAULTS.ENDPOINTS[network]
        );
      case "xrpl:devnet":
        return (
          this.context.config?.advEndpoints?.xrplDevNetEndpoint ||
          DEFAULTS.ENDPOINTS[network]
        );
      default:
        return "";
    }
  }

  return null;
};

Coins.prototype.send = async function ({
  network,
  sourceAddress,
  address,
  amount,
}) {
  // const client = await this.getClient(network);
  log("send", JSON.stringify({ network, sourceAddress, address, amount }));

  return true;
};

Coins.prototype.sendEscrow = async function ({
  network,
  sourceAddress,
  addresses,
  escrow,
}) {
  log(
    "sendEscrow",
    JSON.stringify({ network, sourceAddress, addresses, escrow })
  );

  return true;
};

Coins.prototype.getClient = async function (network) {
  let client = this.clients[network];
  if (!client) {
    const endpoint = await this.getConfig(network, "endpoint");
    switch (network) {
      case "xrpl:testnet":
        client = new xrpl.Client(endpoint);
        break;
      case "xrpl:livenet":
        client = new xrpl.Client(endpoint);
        break;
      case "xrpl:devnet":
        client = new xrpl.Client(endpoint);
        break;
      default:
        throw new Error("unknown network: " + network);
    }
    this.clients[network] = client;

    // auto-connect
    client.on("error", (err) => {
      log(`client [${network}] error`, err.message);
    });

    // client.on('connected', () => {
    // });

    await client.connect();
    return client;
  } else {
    return client;
  }
};

Coins.prototype.disconnect = async function () {
  for (const network in this.clients) {
    const client = this.clients[network];
    await client.disconnect();
  }
};

Coins.prototype.getAccountInfo = async function ({ network, sourceAddress }) {
  // could look at network and use a different client implementation

  const client = await this.getClient(network); // network ~ xrpl:testnet

  // network ~ xrpl:testnet
  const networkType = network.split(":")[0];
  let accountInfo = {};
  if (networkType === "xrpl") {
    try {
      accountInfo = await client.request({
        command: "account_info",
        account: sourceAddress,
        ledger_index: "validated",
      });
    } catch (err) {
      if (err.message === "Account not found.") {
        return null;
      } else {
        throw err;
      }
    }

    return {
      network,
      xrp: xrpl.dropsToXrp(accountInfo.result.account_data.Balance),
      xrpDrops: accountInfo.result.account_data.Balance,
      address: sourceAddress,
      message: "",
    };
  } else {
    throw new Error("unknown network type: " + networkType);
  }
};
