import { Location, Stronghold } from 'tauri-plugin-stronghold-api';

import { writable } from 'svelte/store';

let strongholdClient;
const clientPath = 'what';

const getClient = async () => {
  if (strongholdClient) {
    return strongholdClient;
  }
  const stronghold = new Stronghold('.config', 'password');
  try {
    strongholdClient = stronghold.loadClient(clientPath);
  } catch (e) {
    console.log('e', e);
    try {
      strongholdClient = await stronghold.createClient(clientPath);
    } catch (ee) {
      console.log('ee', ee);
      throw new Error('Could not create client.' + ee);
    }
  }
  return strongholdClient;
};

// get all keys from the store
const getAllKeys = async () => {
  const client = await getClient();
  const keys = await client.listKeys();
  return keys;
};

// get all data from the store
const getAllData = async () => {
  console.log('a');
  const client = await getClient();
  console.log('b', client);
  const store = client.getStore();
  console.log('c', store);

  try {
    const allData = await store.get('config');
    if (allData) {
      console.log('found', allData);
      let data = {};
      return data;
      try {
        data = JSON.parse(new TextDecoder().decode(new Uint8Array(allData)));
        console.log('data', data);
      } catch (e) {
        console.log('e', e);
      }
      return data;
    } else {
      console.log('no data found');
      return {};
    }
  } catch (e) {
    console.log('e2', e);
    return {};
  }
};

const SaveKey = async (key, value) => {
  console.log({ key, value });
  try {
    const client = await getClient();
    const store = client.getStore();

    const data = await getAllData();
    data[key] = value;

    await store.insert(
      'config',
      Array.from(new TextEncoder().encode(JSON.stringify(value)))
    );

    const stronghold = new Stronghold('.config', 'password');
    await stronghold.save();
  } catch (e) {
    console.log(e);
  }
};

const GetKey = (key) => {
  return new Promise((resolve, reject) => {
    console.log('looking for ', key);
    getClient().then((client) => {
      console.log('z');
      const store = client.getStore();
      console.log('looking for 2', key, store);
      store
        .get(key)
        .then((value) => {
          console.log('found', value);
          resolve(new TextDecoder().decode(new Uint8Array(value)));
        })
        .catch((error) => reject(error));
    });
  });
};

const createConfigStore = async () => {
  let data = {};
  try {
    data = await getAllData();
  } catch (e) {
    console.log('e1', e);
  }
  console.log('data2', data);
  const { subscribe, set, update } = writable(data);

  return {
    subscribe,
    update: async (key, value) => {
      await SaveKey(key, value);
      update((data) => {
        data[key] = value;
        return data;
      });
    },
    set,
    // increment: () => update(n => n + 1),
    // decrement: () => update(n => n - 1),
    reset: () => set({}),
  };
};

export default createConfigStore();
