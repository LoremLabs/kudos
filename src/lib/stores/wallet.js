import { createOrReadSeed, deriveKeys } from '$lib/utils/keys-manager';

import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

let initDone = false;
export const createWalletStore = () => {
  let data = {
    salt: '',
    mnemonic: '',
    passPhrase: '',
    keys: {},
    id: 0,
  };
  const { subscribe, update, set } = writable(data);

  return {
    changeActivePersona: async ({ id = 0 }) => {
      if (id === data.id) {
        return;
      }
      const { mnemonic, passPhrase } = data;
      const keys = await deriveKeys({
        mnemonic,
        passPhrase,
        id,
      });
      data = { ...data, keys, id };
      set(data);
    },
    init: async ({ id = 0, passPhrase = '' }) => {
      if (initDone) {
        console.log('using cached init');
        return data;
      }
      const salt = (await invoke('get_salt')) || ''; // used to encrypt local seed data only

      data.salt = salt;
      data.passPhrase = passPhrase;
      let seed;
      try {
        seed = await createOrReadSeed({ salt, id, passPhrase });

        data.mnemonic = seed.mnemonic;

        const keys = await deriveKeys({
          mnemonic: seed.mnemonic,
          passPhrase,
          id,
        });
        // data.xrpl = xrpl;
        // data.eth = eth;
        // data.kudos = { address: eth.address }; // TEMP
        data = { ...data, keys };
        data.id = id;
      } catch (e) {
        console.log({ e });
        alert(e.message);
      }

      // console.log({ data });
      set(data);
      initDone = true;
      return data;
    },
    reset: async () => {
      initDone = false;
      data = {
        salt: '',
        mnemonic: '',
        passPhrase: '',
        keys: {},
        id: 0,
      };
      set(data);
    },
    subscribe,
    update,
  };
};

export const walletStore = createWalletStore();
