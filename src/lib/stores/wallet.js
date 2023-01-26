import createOrReadSeed from '$lib/utils/createOrReadSeed';
import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createWalletStore = () => {
  const data = {
    salt: '',
    mnemonic: '',
    xrpl: {
      address: '',
    },
  };
  const { subscribe, update, set } = writable(data);

  return {
    init: async ({ id = 0, passPhrase = '' }) => {
      const salt = (await invoke('get_salt')) || ''; // used to encrypt local seed data only

      data.salt = salt;
      data.passPhrase = passPhrase;
      let seed;
      try {
        seed = await createOrReadSeed({ salt, id, passPhrase });
        // console.log({ seed });
        data.mnemonic = seed.mnemonic;
        data.xrpl = seed.xrpl;
      } catch (e) {
        console.log({ e });
        alert(e.message);
      }

      // console.log({ data });
      set(data);
      return data;
    },
    subscribe,
    update,
  };
};

export const walletStore = createWalletStore();
