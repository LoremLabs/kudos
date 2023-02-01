import { createOrReadSeed, deriveKeys } from '$lib/utils/keys-manager';

import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createWalletStore = () => {
  let data = {
    salt: '',
    mnemonic: '',
    passPhrase: '',
    keys: {},
    id: 0,
  };
  const { subscribe, update, set } = writable(data);
  let initDone = false;

  return {
    init: async ({ id = 0, passPhrase = '' }) => {
      if (initDone) return data;
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
    subscribe,
    update,
  };
};

export const walletStore = createWalletStore();
