import * as bip39 from "@scure/bip39";

import { HDKey } from "micro-ed25519-hdkey";

export const createHdKeyFromMnemonic = (
  mnemonicSeedphrase: string,
  password: string
) => {
  const masterSeed = bip39.mnemonicToSeedSync(mnemonicSeedphrase, "banister"); // Setlr default

  // See: https://github.com/paulmillr/micro-ed25519-hdkey
  return HDKey.fromMasterSeed(masterSeed); // NB: No versions are passed in here, so the default versions are used.
};
export default createHdKeyFromMnemonic;
