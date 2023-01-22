import bip39 from "bip39";

export const generateMnemonic = () => {
  const mnemonic = bip39.generateMnemonic();
  return mnemonic;
};
