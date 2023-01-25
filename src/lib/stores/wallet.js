import createOrReadSeed from '$lib/utils/createOrReadSeed';
import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createWalletStore = () => {
  const data = {
    seed: '',
    salt: '',
  };
  const { subscribe, update, set } = writable(data);

  return {
    init: async (id = 0) => {
      data.salt = await invoke('get_salt');

      let seed;
      try {
        seed = await createOrReadSeed({ password: data.salt, id });
        // console.log({ seed });
        data.mnemonic = seed.mnemonic;
        data.xrpl = seed.xrpl;
      } catch (e) {
        console.log({ e });
        // alert(e.message);
      }

      // console.log({ data });
      set(data);
    },
    subscribe,
    update,
  };
};

export const walletStore = createWalletStore();
