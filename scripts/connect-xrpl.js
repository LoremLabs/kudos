import * as bip39 from "@scure/bip39";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

import {
  bytesToHex,
  concatBytes,
  createView,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils";

import { HDKey } from "micro-ed25519-hdkey";
import xrpl from "xrpl";

dotenv.config();

const createHdKeyFromMnemonic = (mnemonicSeedphrase, password) => {
  const masterSeed = bip39.mnemonicToSeedSync(mnemonicSeedphrase, password);

  // See: https://github.com/paulmillr/micro-ed25519-hdkey
  return HDKey.fromMasterSeed(masterSeed); // NB: No versions are passed in here, so the default versions are used.
};

async function main() {
  // Define the network client
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();
  console.log("Connected to XRPL Testnet");

  console.log(process.env.SETLER_MNEMONIC, process.env.SETLER_SALT);
  const hdkey = createHdKeyFromMnemonic(
    process.env.SETLER_MNEMONIC,
    process.env.SETLER_SALT
  );
  const keyPair = hdkey.derive("m/44'/144'/0'/0'/0'"); // hardened from .derive("m/44'/144'/0'/0/0");

  console.log({ keyPair });

  const publicKey = bytesToHex(keyPair.publicKey);
  const privateKey = bytesToHex(keyPair.privateKey);
  const Wallet = xrpl.Wallet;
  const wallet = new Wallet(publicKey, `00${privateKey}`, {
    //      masterAddress: ,
  });

  const address = wallet.classicAddress;

  console.log({ address });

  // fund wallet
  // const fund_result  = await client.fundWallet(wallet);
  // console.log({ fund_result });

  const response = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated",
  });
  console.log(response);

  // const address = deriveAddressFromBytes(node.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding
  // console.log({ address });

  // const keyPair = seed?.hdkey.derive("m/44'/144'/0'/0'/0'"); // hardened from .derive("m/44'/144'/0'/0/0");
  // data.keyPair = keyPair?.publicKey;
  // console.log({ keyPair: keyPair?.publicKey });
  // data.publicKey = bytesToHex(keyPair?.publicKey);

  // Disconnect when done (If you omit this, Node.js won't end the process)
  client.disconnect();
}

main();
