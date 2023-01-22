import HDKey from "hdkey";
import bip39 from "bip39";

export const createHdKeyFromMnemonic = (
  mnemonicSeedphrase,
  password,
  versions
) => {
  const masterSeed = bip39
    .mnemonicToSeedSync(mnemonicSeedphrase, password ? password : "banister")
    .toString("hex");
  return HDKey.fromMasterSeed(Buffer.from(masterSeed, "hex"), versions);
};
export default createHdKeyFromMnemonic;
