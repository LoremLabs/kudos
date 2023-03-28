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
  this.seedFile = `${this.configDir}/state/setlr-${context.scope}.seed`;
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

  this.context.keys = await deriveKeys({
    mnemonic: this.context.mnemonic,
    passPhrase: this.context.passPhrase,
    id: this.context.profile,
  });

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

  return this.context.keys;
};
