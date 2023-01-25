import * as addressCodec from '$lib/extern/ripple-address-codec/src';
import * as bip32 from 'ripple-bip32';
import * as hashjs from 'hash.js';

import {
  bytesToHex,
  concatBytes,
  createView,
  hexToBytes,
  utf8ToBytes,
} from '@noble/hashes/utils';

//import { Buffer } from 'buffer';
//import xrpl from "xrpl";
// import * as ripple from "ripple-keypairs";
//import addressCodec from "ripple-address-codec";
//import {  } from 'xrpl';
//import { Buffer } from 'buffer/';
// import {HDKey as bip32} from '@scure/bip32';
//import { HDKey as bip32 } from 'micro-ed25519-hdkey';
import createOrReadSeed from '$lib/utils/createOrReadSeed';
import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

//import * as rippleBip39 from "bip39";

export const createWalletStore = () => {
  const data = {
    seed: '',
    salt: '',
  };
  const { subscribe, update, set } = writable(data);

  return {
    init: async () => {
      data.salt = await invoke('get_salt');

      let seed;
      try {
        seed = await createOrReadSeed({ password: data.salt, id: 0 });
        // console.log({ seed });
        data.seed = seed.mnemonic;
      } catch (e) {
        console.log({ e });
        // alert(e.message);
      }

      // compute for xrpl
      // const seedBytes = hexToBytes(seed.mnemonic);
      // const seedHex = bytesToHex(seedBytes);
      const keyPair = seed?.hdkey.derive("m/44'/144'/0'/0'/0'"); // hardened from .derive("m/44'/144'/0'/0/0");
      // data.keyPair = keyPair?.publicKey;
      // console.log({ keyPair: keyPair?.publicKey });
      data.publicKey = bytesToHex(keyPair?.publicKey);
      data.privateKey = bytesToHex(keyPair?.privateKey);

      // const address = xrpl.deriveAddress(keyPair.publicKey);
      const address = deriveAddressFromBytes(keyPair.publicKey); // see also: https://xrpl.org/accounts.html#address-encoding
      data.address = address;
      // console.log({ data });
      set(data);
    },
    subscribe,
    update,
  };
};

function deriveAddressFromBytes(publicKeyBytes) {
  const publicKeyHash = computePublicKeyHash(publicKeyBytes);
  return addressCodec.encodeAccountID(publicKeyHash);
}
function computePublicKeyHash(publicKeyBytes) {
  const hash256 = hashjs.sha256().update(publicKeyBytes).digest();
  const hash160 = hashjs.ripemd160().update(hash256).digest();
  return hash160; // was Buffer.from(hash160);
}

export const walletStore = createWalletStore();
