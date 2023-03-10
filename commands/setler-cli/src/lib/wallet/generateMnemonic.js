import * as bip39 from "@scure/bip39";

// import { wordlist } from '@scure/bip39/wordlists/english';

export const generateMnemonic = (bits = 256) => {
  const mnemonic = bip39.generateMnemonic(bits);
  return mnemonic;
};
