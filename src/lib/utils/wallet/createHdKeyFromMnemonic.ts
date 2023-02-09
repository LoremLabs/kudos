import * as bip39 from '@scure/bip39';

import { HDKey } from 'micro-ed25519-hdkey';
import { wordlist as wordlistEnglish } from '@scure/bip39/wordlists/english';

export const createHdKeyFromMnemonic = (
  mnemonicSeedphrase: string,
  passPhrase: string
) => {
  const masterSeed = bip39.mnemonicToSeedSync(mnemonicSeedphrase, passPhrase);

  // See: https://github.com/paulmillr/micro-ed25519-hdkey
  return HDKey.fromMasterSeed(masterSeed); // NB: No versions are passed in here, so the default versions are used.
};

export const mnemonicIsValid = ({ mnemonicSeedphrase, wordlist }) => {
  if (!wordlist) {
    wordlist = wordlistEnglish;
  }

  return bip39.validateMnemonic(mnemonicSeedphrase, wordlist); // NB: default word list (english)
};

export default createHdKeyFromMnemonic;
