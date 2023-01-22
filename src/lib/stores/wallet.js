import { writable } from 'svelte/store';

export const wallet = async () => {
  let data = {};
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
    reset: () => set({}),
  };
};