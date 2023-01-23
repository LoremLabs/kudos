import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createWalletStore = async () => {
  let data = {};
  const salt = await invoke('get_salt');
  data.salt = salt;


  const { subscribe, update } = writable(data);

  return {
    subscribe,
    update,
  };
};
export const walletStore = await createWalletStore();


export const wallet2 = async () => {
  

  // try {
  //   data = await getAllData();
  // } catch (e) {
  //   console.log('e1', e);
  // }
  // console.log('data2', data);
  const { subscribe, set, update } = writable(data);

  return {
    subscribe,
    // update: async (key, value) => {
    //   await SaveKey(key, value);
    //   update((data) => {
    //     data[key] = value;
    //     return data;
    //   });
    // },
    set,
    // increment: () => update(n => n + 1),
    // decrement: () => update(n => n - 1),
    // reset: () => set({}),
  };
};