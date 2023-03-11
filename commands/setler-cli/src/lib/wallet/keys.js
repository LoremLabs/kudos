import addressCodec from "ripple-address-codec";
import { bytesToHex } from "@noble/hashes/utils";
import { createHdKeyFromMnemonic } from "./createHdKeyFromMnemonic.js";
import hashjs from "hash.js";
import { utils } from "ethers";

const keyCache = {};

// console.log('hashjs', hashjs);

export const walletKeys = async ({
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

export async function deriveAddress({ coinId, mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic && !coinId) {
    throw new Error("No mnemonic / coinId provided");
  }

  const keys = await walletKeys({
    mnemonic,
    passPhrase,
    path: `m/44'/${coinId}'/${id}'/0/0`,
  });

  return {
    address: keys.address,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}

export async function deriveKudosKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error("No mnemonic provided");
  }
  // 0x500 = 1280
  // seems available? https://github.com/satoshilabs/slips/blob/ef6d7700cc/slip-0044.md TODO: publish on our publish
  return await deriveAddress({ coinId: 1280, mnemonic, passPhrase, id });
}

export function deriveXrplKeys({ hdkey, id = 0 }) {
  if (!hdkey) {
    throw new Error("No hdkey provided");
  }

  const livenet = {};
  const keyPair = hdkey.derive(`m/44'/144'/${id}'/0'/0'`); // hardened from .derive("m/44'/144'/0'/0/0");
  livenet.publicKey = bytesToHex(keyPair?.publicKey);
  livenet.privateKey = bytesToHex(keyPair?.privateKey);
  livenet.address = deriveAddressFromBytes(keyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding

  const testnet = {};
  const testnetKeyPair = hdkey.derive(`m/44'/144'/${id}'/0'/1'`); // hardened from .derive("m/44'/144'/0'/0/0");
  testnet.publicKey = bytesToHex(testnetKeyPair?.publicKey);
  testnet.privateKey = bytesToHex(testnetKeyPair?.privateKey);
  testnet.address = deriveAddressFromBytes(testnetKeyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding

  const devnet = {};
  const devnetKeyPair = hdkey.derive(`m/44'/144'/${id}'/0'/2'`); // hardened from .derive("m/44'/144'/0'/0/0");
  devnet.publicKey = bytesToHex(devnetKeyPair?.publicKey);
  devnet.privateKey = bytesToHex(devnetKeyPair?.privateKey);
  devnet.address = deriveAddressFromBytes(devnetKeyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding

  return { livenet, testnet, devnet };
}

export async function deriveKeys({
  mnemonic,
  passPhrase,
  id = 0,
  useCache = true,
}) {
  if (!mnemonic) {
    throw new Error("No mnemonic provided");
  }

  const cacheKey = `${mnemonic}-${passPhrase}-${id}`;
  if (useCache && keyCache[cacheKey]) {
    return keyCache[cacheKey];
  }

  let manager = {};
  // generate hierarchical deterministic key
  const hdkey = createHdKeyFromMnemonic(mnemonic, passPhrase);

  manager.xrpl = deriveXrplKeys({ hdkey, id });
  manager.kudos = await deriveKudosKeys({ mnemonic, passPhrase, id });
  manager.id = id ? id : 0;

  // store cache
  if (useCache) {
    keyCache[cacheKey] = manager;
  }

  return manager;
}

export function deriveAddressFromBytes(publicKeyBytes) {
  const publicKeyHash = computePublicKeyHash(publicKeyBytes);
  return addressCodec.encodeAccountID(publicKeyHash);
}

export function computePublicKeyHash(publicKeyBytes) {
  const hash256 = hashjs.sha256().update(publicKeyBytes).digest();
  const hash160 = hashjs.ripemd160().update(hash256).digest();
  return hash160; // was Buffer.from(hash160);
}
