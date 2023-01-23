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
    init: async () => {
      data.salt = await invoke('get_salt');
      // data.seed = await createOrReadSeed();
      try {
        const seed = await createOrReadSeed({ password: data.salt, id: 0 });
        console.log({ seed });
        data.seed = seed.seed;  
        console.log({ data });
        set(data);
        } catch (e) {
        console.log({ e });
        alert(e.message);
        }
    },
    subscribe,
    update,
  };
};

export const walletStore = createWalletStore();