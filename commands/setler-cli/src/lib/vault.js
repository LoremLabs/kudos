import { deriveKeys } from "./wallet/keys.js";
import { encryptAES } from "./wallet/encryptSeedAES.js";
import envPaths from "env-paths";
import fs from "fs";

// const vault = new Vault(context);
// vault.set("mnemonic", "mnemonic phrase");

export const Vault = function ({ context }) {
  this.context = context;

  this.configDir = envPaths("setler", {
    suffix: "",
  }).data;
  this.seedFile = `${this.configDir}/state/setlr-${context.scope}.seed`;
};

Vault.prototype.set = function (key, value) {
  // set the value in the vault
  this.context[key] = value;
  if (key === "mnemonic") {
    this.context.keys = deriveKeys({
      mnemonic: value,
      passPhrase: this.context.passPhrase,
      id: this.context.profile,
    });
  }
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
