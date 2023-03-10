import { utils } from "ethers";

export const ethWallet = async ({
  mnemonic,
  passPhrase,
  // wordlist, // TODO
  path = `m/44'/60'/0'/0/0`,
}) => {
  // if (!wordlist) {
  //     wordlist = wordlistEnglish.join(' ');
  // }
  // Wordlist.register(wordlist, 'custom'); // not actually custom, but so we can change it later

  const hd = await utils.HDNode.fromMnemonic(
    mnemonic,
    passPhrase
    //    'custom'
  );

  const masterNode = await hd.derivePath(path);
  return {
    address: masterNode.address,
    privateKey: masterNode.privateKey,
    publicKey: masterNode.publicKey,
  };
};
