import { Wallet, utils } from 'ethers';

import stringify from 'json-stringify-deterministic';

export const packageKudos = async (items, wallet) => {
  // given an array of kudos, create a payload with signature and address
  const signer = new Wallet(wallet.privateKey);
  const data = {
    kudos: items,
    address: wallet.address,
  };
  const { message, signature } = await signObject(data, signer);
  data.message = message;
  data.signature = signature;
  return data;
};

export const signObject = async (object, signer) => {
  const payload = stringify(object);
  const message = utils.toUtf8Bytes(payload);
  const base64Message = utils.base64.encode(message);
  const signature = await signer.signMessage(base64Message);

  return { payload, message: base64Message, signature };
};

export const signKudos = async (kudos, wallet) => {
  const simpleKudo = {
    identifier: kudos.identifier, // did:ethr:0x123
    id: kudos.id, // uuid
    createTime: kudos.createTime, // timestamp 2023-01-01T00:00:00.000Z
    traceId: kudos.traceId, // traceId
    weight: kudos.weight, // numeric TODO: validate between 0 and 1 or 100?
  };

  const signer = new Wallet(wallet.privateKey);

  const { payload, message, signature } = await signObject(simpleKudo, signer);

  const signerAddress = await utils.verifyMessage(message, signature);
  const valid = signerAddress === wallet.address;
  if (!valid) {
    throw new Error('Invalid signature');
  }

  const results = {
    signature,
    signer: wallet.address,
    kudos: simpleKudo,
    payload,
    message,
  };
  console.log({ results });

  return results;
};
