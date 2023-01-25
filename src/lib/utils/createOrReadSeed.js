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
import { generateMnemonic } from './wallet/generateMnemonic';

export default async function createOrReadSeed({
  salt = '',
  passPhrase = '',
  id = 0,
}) {
  const s = {};
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
      // generate hd key
      s.hdkey = createHdKeyFromMnemonic(s.mnemonic, passPhrase);
      console.log('Read Existing Mnemonic from storage');
    } else {
      throw new Error('File not found');
    }
  } catch (err) {
    if (err && err.message === 'File not found') {
      console.log('No Seed yet. Creating new one', err);

      s.mnemonic = generateMnemonic();

      // generate hd key and encrypt with password
      s.hdkey = createHdKeyFromMnemonic(s.mnemonic, passPhrase);
      const encryptedS = encryptAES(s.mnemonic, salt);

      // save in local file
      console.log('saving new encrypted seed phrase!', encryptedS, { s });
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

  if (s.mnemonic) {
    const xrplData = {};
    // compute for xrpl
    const keyPair = s.hdkey.derive(`m/44'/144'/0'/0'/${id}'`); // hardened from .derive("m/44'/144'/0'/0/0");
    xrplData.publicKey = bytesToHex(keyPair?.publicKey);
    xrplData.privateKey = bytesToHex(keyPair?.privateKey);

    // const address = xrpl.deriveAddress(keyPair.publicKey);
    const address = deriveAddressFromBytes(keyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding
    xrplData.address = address;
    s.xrpl = xrplData;
  } else {
    s.xrpl = {};
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
