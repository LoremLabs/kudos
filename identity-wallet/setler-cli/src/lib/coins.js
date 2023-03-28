import { DEFAULTS } from "./config.js";
import crypto from "node:crypto";
import cryptoCondition from "five-bells-condition"; // TODO: use crypto-conditions?
import fetch from "node-fetch";
import xrpl from "xrpl";

const log = console.log;

// wrapper for crypto related things
export const Coins = function ({ context }) {
  this.context = context;

  this.clients = {}; // cache of clients
  this.wallets = {}; // cache of wallets
};

Coins.prototype.fulfillEscrow = async function ({
  network,
  address,
  owner,
  sequence,
  fulfillment,
  condition,
}) {
  const client = await this.getClient(network);
  const wallet = await this.getWallet(address);

  const Fee = (
    330 +
    10 * Math.ceil(Buffer.byteLength(fulfillment) / 16)
  ).toString();

  const tx = {
    TransactionType: "EscrowFinish",
    Account: address, // the wallet owner
    Owner: owner, // the address that first created the escrow
    OfferSequence: Number(sequence),
    Condition: condition,
    Fulfillment: fulfillment,
    Fee,
  };

  const { result } = await client.submitAndWait(tx, { wallet });
  // check to see if the result is a success
  if (!result || result?.meta?.TransactionResult !== "tesSUCCESS") {
    throw new Error(`failed: ${result.meta?.TransactionResult} ${result.hash}`);
  }

  return result;
};

Coins.prototype.cancelEscrow = async function ({
  network,
  address,
  owner,
  sequence,
  fulfillment,
  condition,
}) {
  const client = await this.getClient(network);
  const wallet = await this.getWallet(address);

  const Fee = (
    330 +
    10 * Math.ceil(Buffer.byteLength(fulfillment) / 16)
  ).toString();

  const tx = {
    TransactionType: "EscrowCancel",
    Account: address, // the wallet owner
    Owner: owner, // the address that first created the escrow
    OfferSequence: Number(sequence),
    Condition: condition,
    Fulfillment: fulfillment,
    Fee,
  };

  const { result } = await client.submitAndWait(tx, { wallet });
  // check to see if the result is a success
  if (!result || result?.meta?.TransactionResult !== "tesSUCCESS") {
    throw new Error(`failed: ${result.meta?.TransactionResult} ${result.hash}`);
  }

  return result;
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
    await client.connect();
    return client;
  }
};

Coins.prototype.disconnect = async function () {
  for (const network in this.clients) {
    const client = this.clients[network];
    await client.disconnect();
  }
};

Coins.prototype.getWallet = async function (address) {
  if (this.wallets[address]) {
    return this.wallets[address];
  }

  // otherwise, create from the context
  await this.context.vault.keys();
  const walletKeys = this.context.addressKeys[address];
  if (!walletKeys) {
    throw new Error(`Wallet not found for address: ${address}`);
  }
  const wallet = new xrpl.Wallet(walletKeys.publicKey, walletKeys.privateKey, {
    masterAddress: address,
  });
  if (wallet.classicAddress !== address) {
    throw new Error(
      `Wallet address mismatch: ${wallet.classicAddress} !== ${address}`
    );
  }

  this.wallets[address] = wallet;
  return wallet;
};

Coins.prototype.fundViaFaucet = async function ({ network, address }) {
  const client = await this.getClient(network);
  const wallet = await this.getWallet(address);

  const { balance } = await client.fundWallet(wallet);
  // console.log({balance});
  return { balance };
};

const conversionRate = {};
const CONVERSION_API =
  "https://www.binance.com/api/v3/ticker/price?symbol=XRPUSDT";
const CONVERSION_CACHE_MS = 1000 * 60 * 5; // 5 minutes

Coins.prototype.convertXrpToUsd = async (xrp, noCache) => {
  // get the conversion rate
  let rate = conversionRate["xrp-usd"];

  const ts = Date.now();
  if (!rate || noCache || ts - rate?.ts > CONVERSION_CACHE_MS) {
    const response = await fetch(CONVERSION_API, {
      method: "GET",
      timeout: 30,
    });
    const data = await response.json();
    if (data && data.price) {
      rate = {
        rate: data.price,
        ts,
      };
      conversionRate["xrp-usd"] = { ...rate };
    } else {
      throw new Error("Invalid conversion data");
    }
  }

  // convert the xrp to usd
  const usd = xrp * rate.rate;
  // console.log({ xrp, rate: rate.rate, usd });
  return { usd, xrp, rate: rate.rate };
};

Coins.prototype.getBalancesXrpl = async function ({ network, address }) {
  const client = await this.getClient(network);

  //   // get the balance
  let balance;
  try {
    balance = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });
  } catch (e) {
    if (
      e.message.toLowerCase().includes("disconnected") ||
      e.message.toLowerCase().includes("reset")
    ) {
      // try to reconnect
      console.log("reconnecting", network, address);
      await client.connect();
      balance = await client.request({
        command: "account_info",
        account: address,
        ledger_index: "validated",
      });
    } else if (e.message.toLowerCase().includes("not found")) {
      // return an empty balance
      return {
        asset: network,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: "Account not found",
      };
    } else if (e.message.toLowerCase().includes("connection failed")) {
      return {
        asset: network,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: "Account not found",
      };
    } else {
      // throw e;
      console.log("errr!", e, e.message);
      return {
        asset: network,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: e.message,
      };
    }
  }

  // console.log("balance", balance);

  // convert the xrp to usd
  const { usd } = await this.convertXrpToUsd(
    xrpl.dropsToXrp(balance.result.account_data.Balance)
  );

  // return the balance
  return {
    asset: network,
    xrp: xrpl.dropsToXrp(balance.result.account_data.Balance),
    xrpDrops: balance.result.account_data.Balance,
    usd,
    address: address,
    message: "",
  };
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

Coins.prototype.estimatedSendFee = async function ({
  network,
  sourceAddress,
  address,
  amount,
  // amountDrops,
}) {
  const client = await this.getClient(network);

  const wallet = await this.getWallet(sourceAddress);

  const tx = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Amount: xrpl.xrpToDrops(amount),
    Destination: address,
  };

  // Prepare transaction -------------------------------------------------------
  const prepared = await client.autofill(tx);
  // console.log("Prepared transaction", prepared);

  return xrpl.dropsToXrp(prepared.Fee);
};

Coins.prototype.send = async function ({
  network,
  sourceAddress,
  address,
  amount,
  amountDrops,
}) {
  const client = await this.getClient(network);
  // log("send", JSON.stringify({ network, sourceAddress, address, amount }));

  if (amountDrops != xrpl.xrpToDrops(amount)) {
    console.log("amountDrops", amountDrops);
    console.log("xrpl.xrpToDrops(amount)", xrpl.xrpToDrops(amount));
    throw new Error("Amount Drops calculation error?");
  }

  const wallet = await this.getWallet(sourceAddress);

  const tx = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Amount: xrpl.xrpToDrops(amount),
    Destination: address,
  };

  // Prepare transaction -------------------------------------------------------
  const prepared = await client.autofill(tx);
  // console.log("Prepared transaction instructions:", prepared);

  //prepared.SigningPubKey = wallet.publicKey;
  // const max_ledger = prepared.LastLedgerSequence;

  // console.log("Transaction cost:", xrpl.dropsToXrp(prepared.Fee), "XRP");
  // console.log("Transaction expires after ledger:", max_ledger);
  const signed = wallet.sign(prepared);

  // console.log("Identifying hash:", signed.hash);
  // console.log("Signed blob:", signed.tx_blob);

  let result;
  try {
    result = await client.submitAndWait(signed.tx_blob);
  } catch (err) {
    console.log("Error:", err, err.message);
    throw err;
  }
  // console.log("send result", result);
  return result;
};

Coins.prototype.sendDirectoryPayment = async function ({
  network,
  sourceAddress,
  address,
  credentials,
  amount,
  amountDrops,
}) {
  // create a payment to address, for ammount
  // we create a memo for each credential

  const client = await this.getClient(network);
  if (amountDrops != xrpl.xrpToDrops(amount)) {
    console.log("amountDrops", amountDrops);
    console.log("xrpl.xrpToDrops(amount)", xrpl.xrpToDrops(amount));
    throw new Error("Amount Drops calculation error?");
  }

  const wallet = await this.getWallet(sourceAddress);

  const Memos = [];
  for (let i = 0; i < credentials.length; i++) {
    const credential = credentials[i];
    if (credential.type === "s2s") {
      // mapping: data.mapping["credential-map"],
      // signature: data.mapping.signature,
      // issuer: data.mapping["credential-issuer"] || "send-to-social", // TODO

      // Enter memo data to insert into a transaction
      const MemoData = xrpl
        .convertStringToHex(
          JSON.stringify([
            credential.issuer,
            credential.mapping,
            credential.signature,
          ])
        )
        .toUpperCase();
      const MemoType = xrpl.convertStringToHex("s2s").toUpperCase();
      // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
      const MemoFormat = xrpl
        .convertStringToHex("application/json")
        .toUpperCase();
      Memos.push({
        Memo: {
          MemoType,
          MemoFormat,
          MemoData,
        },
      });
    }
  }

  const tx = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Amount: xrpl.xrpToDrops(amount),
    Destination: address,
    Memos,
  };

  // Prepare transaction -------------------------------------------------------
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);

  let result;
  try {
    result = await client.submitAndWait(signed.tx_blob);
  } catch (err) {
    console.log("Error:", err, err.message);
    throw err;
  }
  console.log("send result", result);
  return result;
};

Coins.prototype.sendEscrow = async function ({
  network,
  sourceAddress,
  address,
  escrow,
  amount,
  amountDrops,
}) {
  // log(
  //   "sendEscrow",
  //   JSON.stringify({ network, sourceAddress, addresses, escrow }, null, 2)
  // );

  // {
  //   "network": "xrpl:testnet",
  //   "sourceAddress": "r4bqzg7iZFBGmLyYRa3o6vgtCMDzvVoRCh",
  //   "escrow": {
  //     "identifier": "did:kudos:matt@loremlabs.com",
  //     "type": "xrpl:testnet",
  //     "address": "raxswZCMXNNoCVd54HJUX36eMstNq7TDCj",
  //     "time": 604800
  //   }
  // }

  const fulfillmentBytes = crypto.randomBytes(32); // could use string, but why

  let myFulfillment = new cryptoCondition.PreimageSha256();
  myFulfillment.setPreimage(fulfillmentBytes);

  // to include in tx
  const condition = myFulfillment
    .getConditionBinary()
    .toString("hex")
    .toUpperCase();

  // keep secret until you want to finish executing the held payment:
  const fulfillmentTicket = myFulfillment
    .serializeBinary()
    .toString("hex")
    .toUpperCase();

  // get expiration time
  const cancelAfterIso = new Date(
    Date.now() + (parseInt(escrow.time, 10) || 300) * 1000
  ).toISOString();
  const cancelAfter = xrpl.isoTimeToRippleTime(cancelAfterIso); // TODO: check for enough escrow.time, defaulting to 5 minutes

  const client = await this.getClient(network);
  if (amountDrops != xrpl.xrpToDrops(amount)) {
    console.log("amountDrops", amountDrops);
    console.log("xrpl.xrpToDrops(amount)", xrpl.xrpToDrops(amount));
    throw new Error("Amount Drops calculation error?");
  }

  const wallet = await this.getWallet(sourceAddress);

  // Enter memo data to insert into a transaction
  const MemoData = xrpl.convertStringToHex(escrow.identifier).toUpperCase();
  const MemoType = xrpl.convertStringToHex("relayto.identifier").toUpperCase();
  // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
  const MemoFormat = xrpl.convertStringToHex("text/plain").toUpperCase();
  const Memos = [
    {
      Memo: {
        MemoType,
        MemoFormat,
        MemoData,
      },
    },
  ];

  const escrowTx = {
    TransactionType: "EscrowCreate",
    Account: wallet.classicAddress,
    Destination: address,
    Amount: xrpl.xrpToDrops(amount),
    CancelAfter: cancelAfter,
    Condition: condition,
    // DestinationTag: 12345,
    Memos, // shows up in tx history, used as source for relayto.identifier
  };

  const prepared = await client.autofill(escrowTx);
  const signed = wallet.sign(prepared);

  let result;
  try {
    result = await client.submitAndWait(signed.tx_blob);
  } catch (err) {
    console.log("Error:", err, err.message);
    throw err;
  }
  // console.log("send result", result);
  return { result, fulfillmentTicket, escrowTx, condition };
};

Coins.prototype.getTransaction = async function ({ network, txHash }) {
  const client = await this.getClient(network);

  // network ~ xrpl:testnet
  const networkType = network.split(":")[0];
  let tx;
  if (networkType === "xrpl") {
    try {
      tx = await client.request({
        command: "tx",
        transaction: txHash,
        binary: false,
      });
    } catch (err) {
      if (err.message === "transaction not found") {
        return null;
      } else {
        throw err;
      }
    }
  } else {
    throw new Error("unknown network: " + network);
  }

  return tx;
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
