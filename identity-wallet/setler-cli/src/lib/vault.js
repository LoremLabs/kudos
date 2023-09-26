import * as secp256k1 from "@noble/secp256k1";

import { bytesToHex, hexToBytes as hexTo } from "@noble/hashes/utils";
import { deriveAddressFromBytes, deriveKeys } from "./wallet/keys.js";

import { encryptAES } from "./wallet/encryptSeedAES.js";
import envPaths from "env-paths";
import fs from "fs";
import { sha256 } from "@noble/hashes/sha256";

// const vault = new Vault(context);
// await vault.set("mnemonic", "mnemonic phrase");

export const Vault = function ({ context }) {
  // TODO: share as a package?
  this.context = context;

  this.configDir = envPaths("setler", {
    suffix: "",
  }).data;
  this.seedFile = `${this.configDir}/state/setlr-${context.wallet}.seed`;
};

Vault.prototype.set = async function (key, value) {
  // set the value in the vault
  this.context[key] = value;
  if (key === "mnemonic") {
    this.context.keys = await deriveKeys({
      mnemonic: value,
      passPhrase: this.context.passPhrase,
      id: this.context.profile,
    });
  }
};

const hexToBytes = (hex) => {
  // check if it's a hex string, starting with 0x
  if (typeof hex === "string" && hex.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
    // strip off the 0x
    hex = hex.slice(2);
  }

  return hexTo(hex);
};

Vault.prototype.verify = async function (params) {
  const { keys, signature, message } = params;

  const hashedMessage = sha256(message);

  // verify the signature
  const verified = secp256k1.verify(
    hexToBytes(signature),
    hashedMessage,
    hexToBytes(keys.publicKey)
  );

  return verified;
};

Vault.prototype.verifyMessage = async function (params) {
  const { keys, signature, message } = params;

  const hashedMessage = sha256(message);

  // verify the signature
  const verified = secp256k1.verify(
    hexToBytes(signature),
    hashedMessage,
    hexToBytes(keys.publicKey)
  );
  if (verified) {
    // check that the message.address matches the publicKey
    try {
      const msg = JSON.parse(message);
      const address = deriveAddressFromBytes(hexToBytes(keys.publicKey));
      if (address !== msg.a) {
        // console.log({address, msg});
        return false;
      }
    } catch {
      return false;
    }
  }

  return verified;
};

Vault.prototype.sign = async function (params) {
  // sign the message with signingKey
  // uses Generates low-s deterministic ECDSA signature as per RFC6979
  // we can recover the public address this way

  const { message, signingKey } = params;
  const hashedMessage = sha256(message);

  const [sig, recId] = await secp256k1.sign(
    hashedMessage,
    hexToBytes(signingKey),
    {
      recovered: true,
    }
  );

  return { signature: bytesToHex(sig), recId }; // not 0x prefixed
};

Vault.prototype.write = function (key, value) {
  this.set(key, value);

  // if key == mnemonic, then derive the keys and set them in the context
  if (key === "mnemonic") {
    // TODO: ask to override?

    // check to make sure salt and value is set
    if (!this.context.salt) {
      throw new Error("Salt is not set");
    }
    if (!value) {
      throw new Error("Mnemonic is not set");
    }

    const encrypted = encryptAES(value, this.context.salt);
    fs.writeFileSync(this.seedFile, encrypted, "utf8");
  }
};

Vault.prototype.keys = async function () {
  if (this.context.keys) {
    return this.context.keys;
  }
  // see if we have an env var or do we need to derive the keys
  if (this.context.mnemonic) {
    this.context.keys = await deriveKeys({
      mnemonic: this.context.mnemonic,
      passPhrase: this.context.passPhrase,
      id: this.context.profile,
    });
  }

  // seed from env variable, base64decoded
  const envKey =
    this.context.config.auth[
      `SETLER_KEYS_${
        parseInt(this.context.wallet, 10) ? this.context.wallet + "_" : ""
      }${parseInt(this.context.profile, 10)}`
    ];
  this.context.keysEnv = this.context.keysEnv || {};
  this.context.keys = this.context.keys || {};

  if (envKey) {
    try {
      let encodedKeys = envKey;
      encodedKeys = Buffer.from(encodedKeys, "base64url").toString("utf8");

      this.context.keysEnv = JSON.parse(encodedKeys);
    } catch (e) {
      throw new Error(
        `Could not find keys for profile SETLER_KEYS_${this.context.profile}`
      );
    }
  }

  // override with keys from env
  if (this.context.keysEnv) {
    this.context.keys = { ...this.context.keys, ...this.context.keysEnv };
  }

  // flatten tree to one level, keyed off address
  const addressKeys = {};
  for (const [, value] of Object.entries(this.context.keys)) {
    if (value.address) {
      // top level
      addressKeys[value.address] = value;
    } else {
      // nested
      for (const [, value2] of Object.entries(value)) {
        addressKeys[value2.address] = value2;
      }
    }
  }
  this.context.addressKeys = addressKeys;

  // keys: {
  //   "kudos": {
  //     "address": "rsMbD7dEMq92ZWfbBorEPNdDaiZypKs8D6",
  //     "privateKey": "00D4625AF1D2F84E9ED577216F90F9D61C9644E792374726171A7B0369B5151D38",
  //     "publicKey": "02284096B7A9462E9B59E225B09346CA645FD67E856DA4A4ADC94AA18A8E8FCDF0"
  //   }
  // }

  return this.context.keys;
};
