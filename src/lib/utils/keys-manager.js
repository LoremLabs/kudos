import * as addressCodec from '$lib/extern/ripple-address-codec/src';
import * as hashjs from 'hash.js';

import {
  BaseDirectory,
  createDir,
  exists,
  readTextFile,
  writeFile,
} from '@tauri-apps/api/fs';

import { appLocalDataDir } from '@tauri-apps/api/path';
import { bytesToHex } from '@noble/hashes/utils';
import { createHdKeyFromMnemonic } from './wallet/createHdKeyFromMnemonic';
import { decryptAES } from './wallet/decryptSeedAES';
import { encryptAES } from './wallet/encryptSeedAES';
import { ethWallet } from './wallet/ethWallet';
import { generateMnemonic } from './wallet/generateMnemonic';

export async function deriveAddress({ coinId, mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic && !coinId) {
    throw new Error('No mnemonic / coinId provided');
  }

  const keys = await ethWallet({
    mnemonic,
    passPhrase,
    path: `m/44'/${coinId}'/0'/0/${id}`,
  });

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

export function deriveXrplKeys({ hdkey, id = 0 }) {
  if (!hdkey) {
    throw new Error('No hdkey provided');
  }

  const xrplData = {};
  const keyPair = hdkey.derive(`m/44'/144'/0'/0'/${id}'`); // hardened from .derive("m/44'/144'/0'/0/0");
  xrplData.publicKey = bytesToHex(keyPair?.publicKey);
  xrplData.privateKey = bytesToHex(keyPair?.privateKey);

  const address = deriveAddressFromBytes(keyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding
  xrplData.address = address;
  return xrplData;
}

export async function deriveKeys({ mnemonic, passPhrase, id = 0 }) {
  if (!mnemonic) {
    throw new Error('No mnemonic provided');
  }

  let manager = {};
  // generate hierarchical deterministic key
  const hdkey = createHdKeyFromMnemonic(mnemonic, passPhrase);

  manager.xrpl = deriveXrplKeys({ hdkey, id });
  manager.eth = await deriveEthKeys({ mnemonic, passPhrase, id });
  manager.kudos = await deriveKudosKeys({ mnemonic, passPhrase, id });
  manager.id = id ? id : 0;

  return manager;
}

/* Returns { mnemonic } */
export async function createOrReadSeed({
  salt = '', // used to encrypt local seed data only
  passPhrase = '', // 25th word, part of the seed phrase
  id = 0,
}) {
  const s = { id, mnemonic: '' };
  const baseDir = await appLocalDataDir();
  await createDir(`${baseDir}state`, {
    // dir: baseDir,
    recursive: true,
  });

  const fullPath = `${baseDir}state/setlr-${id}.seed`;

  try {
    const fileFound = await exists(fullPath);
    if (fileFound) {
      console.log('Seed phrase exists');

      const data = await readTextFile(fullPath);
      s.mnemonic = decryptAES(data, salt);
      console.log('Read Existing Mnemonic from storage');
    } else {
      throw new Error('File not found');
    }
  } catch (err) {
    if (err && err.message === 'File not found') {
      console.log('No Seed yet. Creating new one', err);

      s.mnemonic = generateMnemonic();

      const encryptedS = encryptAES(s.mnemonic, salt);
      // save in local file
      // console.log('saving new encrypted seed phrase!', encryptedS, { s });
      try {
        await writeFile({ contents: encryptedS, path: fullPath });
      } catch (ee) {
        console.log('error writing file', ee);
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
