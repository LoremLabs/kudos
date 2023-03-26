// import * as addressCodec from '$lib/extern/ripple-address-codec/src';
import * as addressCodec from 'ripple-address-codec';
import * as hashjs from 'hash.js';

import {
  BaseDirectory,
  copyFile,
  createDir,
  exists,
  readTextFile,
  writeFile,
} from '@tauri-apps/api/fs';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import {
  createHdKeyFromMnemonic,
  mnemonicIsValid,
} from './wallet/createHdKeyFromMnemonic';

import { appLocalDataDir } from '@tauri-apps/api/path';
import { decryptAES } from './wallet/decryptSeedAES';
import { encryptAES } from './wallet/encryptSeedAES';
import { ethWallet } from './wallet/ethWallet';
import { generateMnemonic } from './wallet/generateMnemonic';
import { noop } from '$lib/utils/noop';
import { shortId } from '$lib/utils/short-id';

const seedCache = {};

export async function deriveAddress({
  coinId,
  mnemonic,
  passPhrase,
  id = 0,
  leaf = 0,
  isXrpl = false,
}) {
  if (!mnemonic && !coinId) {
    throw new Error('No mnemonic / coinId provided');
  }

  const keys = await ethWallet({
    mnemonic,
    passPhrase,
    path: `m/44'/${coinId}'/${id}'/0/${leaf}`,
  });

  if (isXrpl) {
    // use xrpl address encoding
    // remove 0x from start of public key
    if (keys.publicKey.startsWith('0x')) {
      keys.publicKey = keys.publicKey.slice(2);
      keys.publicKey = `${keys.publicKey}`;
    }
    keys.address = deriveAddressFromBytes(hexToBytes(keys.publicKey));
    if (keys.privateKey.startsWith('0x')) {
      keys.privateKey = keys.privateKey.slice(2);
    }
    keys.privateKey = `00${keys.privateKey}`;
    // toUpperCase() ?
  }

  return {
    address: keys.address,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}

export async function deriveEthKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
  }

  return await deriveAddress({ coinId: 60, mnemonic, passPhrase, id });
}

export async function deriveKudosKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
  }
  // 0x500 = 1280
  // seems available? https://github.com/satoshilabs/slips/blob/ef6d7700cc/slip-0044.md TODO: publish on our publish
  return await deriveAddress({ coinId: 1280, mnemonic, passPhrase, id });
}

export async function deriveXrplKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
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
    leaf: 1,
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

export function deriveXrplKeys2({ hdkey, id = 0 }) {
  if (!hdkey) {
    throw new Error('No hdkey provided');
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

const keyCache = {};

export async function deriveKeys({
  mnemonic,
  passPhrase,
  id = 0,
  useCache = true,
}) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
  }

  const cacheKey = `${mnemonic}-${passPhrase}-${id}`;
  if (useCache && keyCache[cacheKey]) {
    return keyCache[cacheKey];
  }

  let manager = {};
  // generate hierarchical deterministic key
  const hdkey = createHdKeyFromMnemonic(mnemonic, passPhrase);

  await noop(); // give the ui time to do its thing
  manager.xrpl = await deriveXrplKeys({ mnemonic, hdkey, id });
  await noop(); // give the ui time to do its thing
  manager.eth = await deriveEthKeys({ mnemonic, passPhrase, id });
  await noop(); // give the ui time to do its thing
  manager.kudos = await deriveKudosKeys({ mnemonic, passPhrase, id });
  await noop(); // give the ui time to do its thing
  manager.id = id ? id : 0;

  const testnet = {};
  const testnetKeyPair = hdkey.derive(`m/44'/144'/${id}'/0'/1'`); // hardened from .derive("m/44'/144'/0'/0/0");
  testnet.publicKey = bytesToHex(testnetKeyPair?.publicKey);
  testnet.privateKey = bytesToHex(testnetKeyPair?.privateKey);
  testnet.address = deriveAddressFromBytes(testnetKeyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding
  console.log('testnet', { testnet });

  // store cache
  if (useCache) {
    keyCache[cacheKey] = manager;
  }

  return manager;
}

export function seedIsValid({ mnemonic, passPhrase }) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
  }
  return mnemonicIsValid({ mnemonicSeedphrase: mnemonic, passPhrase });
}
/* Returns { mnemonic } */
export async function saveSeed({
  mnemonic = '',
  id = 0,
  salt = '', // used to encrypt local seed data only
  backupExisting = true,
}) {
  // if we already have a seed file, we'll make a backup in case the user
  // is doing this by mistake. They'll still need their phrase though.
  // And TODO: there's no interface for this now, but it could exist on
  // the settings page to restore one.
  // see if seed currently exists

  const s = { id, mnemonic };
  const baseDir = await appLocalDataDir();
  await createDir(`${baseDir}state`, {
    // dir: baseDir,
    recursive: true,
  });

  const fullPath = `${baseDir}state/setlr-${id}.seed`;

  try {
    const fileFound = await exists(fullPath);
    if (fileFound && backupExisting) {
      // console.log('Seed phrase exists, backing up');

      const backupId = shortId();

      // copy to backup path ... date should give an idea even if id doesn't
      const backupPath = `${baseDir}state/setlr-backup-${id}-${backupId}.seed`;
      // console.log({ backupPath });
      await copyFile(fullPath, backupPath);
    }
  } catch (e) {
    console.log('e', e);
    throw new Error('Error saving seed backup');
  }

  // TODO: check if valid mnemonic?
  const encryptedS = encryptAES(s.mnemonic, salt);
  // save in local file
  // console.log('saving new encrypted seed phrase!', encryptedS, { s });
  try {
    await writeFile({ contents: encryptedS, path: fullPath });
  } catch (ee) {
    console.log('error writing file', ee);
    throw new Error('Error writing seed file [1]');
  }

  return s;
}

/* Returns { mnemonic } */
export async function createOrReadSeed({
  salt = '', // used to encrypt local seed data only
  passPhrase = '', // 25th word, part of the seed phrase
  scope = 0, // used to create a unique seed for each app, currently only 0 is used for setlr
  id = 0,
  useCache = true,
}) {
  const s = { id, mnemonic: '' };
  // check our seedCache to see if we already have this seed id
  if (useCache && seedCache[`scope-${scope}`]) {
    // console.log('Seed phrase exists in cache');
    return seedCache[`scope-${scope}`];
  }

  const baseDir = await appLocalDataDir();
  await createDir(`${baseDir}state`, {
    // dir: baseDir,
    recursive: true,
  });

  const fullPath = `${baseDir}state/setlr-${scope}.seed`;

  try {
    const fileFound = await exists(fullPath);
    if (fileFound) {
      // console.log('Seed phrase exists');

      const data = await readTextFile(fullPath);
      s.mnemonic = decryptAES(data, salt);
      // console.log('Read Existing Mnemonic from storage');
    } else {
      throw new Error('File not found');
    }

    // if here, we have a valid mnemonic
    // cache it in memory for this session
    if (useCache) {
      seedCache[`scope-${scope}`] = s;
    }
  } catch (err) {
    if (err && err.message === 'File not found') {
      // console.log('No Seed yet. Creating new one', err);

      s.mnemonic = generateMnemonic();

      const encryptedS = encryptAES(s.mnemonic, salt);
      // save in local file
      // console.log('saving new encrypted seed phrase!', encryptedS, { s });
      try {
        await writeFile({ contents: encryptedS, path: fullPath });
      } catch (ee) {
        console.log('error writing file', ee);
        throw new Error('Error writing seed file [2]');
      }
    } else {
      //  Invalid mnemonic
      console.log('Invalid mnemonic', err);
      // TODO: handle this error... we don't want to overwrite the seed
      throw err;
    }
  }

  return s;
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
