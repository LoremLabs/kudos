import { Wallet, utils } from 'ethers';

export const signKudos = async (kudo, wallet) => {
  console.log({ wallet });

  const signer = new Wallet(wallet.privateKey);

  // TODO: create message in another function
  const message = utils.toUtf8Bytes(JSON.stringify(kudo));

  const signature = await signer.signMessage(message);

  const signerAddress = await utils.verifyMessage(message, signature);
  const valid = signerAddress === wallet.address;
  if (!valid) {
    throw new Error('Invalid signature');
  }

  const results = { signature, valid, signer: wallet.address };
  //   console.log(results);

  return results;
};
