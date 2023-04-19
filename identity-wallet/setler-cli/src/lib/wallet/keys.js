import addressCodec from "ripple-address-codec";
import { createHdKeyFromMnemonic } from "./createHdKeyFromMnemonic.js";
import hashjs from "hash.js";
import { hexToBytes } from "@noble/hashes/utils";
import { utils } from "ethers";

const keyCache = {};

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

export async function deriveAddress({
  coinId,
  mnemonic,
  passPhrase,
  id = 0,
  leaf = 0,
  isXrpl = false,
}) {
  if (!mnemonic && !coinId) {
    throw new Error("No mnemonic / coinId provided");
  }

  const keys = await walletKeys({
    mnemonic,
    passPhrase,
    path: `m/44'/${coinId}'/${id}'/0/${leaf}`,
  });

  if (isXrpl) {
    // use xrpl address encoding
    // remove 0x from start of public key
    if (keys.publicKey.startsWith("0x")) {
      keys.publicKey = keys.publicKey.slice(2);
      keys.publicKey = `${keys.publicKey}`.toUpperCase();
    }
    keys.address = deriveAddressFromBytes(hexToBytes(keys.publicKey));
    if (keys.privateKey.startsWith("0x")) {
      keys.privateKey = keys.privateKey.slice(2);
    }
    keys.privateKey = `00${keys.privateKey}`.toUpperCase();
  }

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
  return await deriveAddress({
    coinId: 1280,
    mnemonic,
    passPhrase,
    id,
    isXrpl: true,
  });
}

export async function deriveXrplKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error("No mnemonic provided");
  }
  const livenet = await deriveAddress({
    coinId: 144,
    mnemonic,
    passPhrase,
    isXrpl: true,
    id,
    leaf: 0,
  });
  const testnet = await deriveAddress({
    coinId: 144,
    mnemonic,
    passPhrase,
    isXrpl: true,
    id,
    leaf: 1, // this is a convention used here for testnet and devnet. TODO: what do others do? Different coinId?
  });
  const devnet = await deriveAddress({
    coinId: 144,
    mnemonic,
    passPhrase,
    isXrpl: true,
    id,
    leaf: 2,
  });

  return {
    livenet,
    testnet,
    devnet,
  };
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

  manager.xrpl = await deriveXrplKeys({ mnemonic, hdkey, id });
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
