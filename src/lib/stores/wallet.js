// import { writable } from 'svelte/store';
import {
  activePersonaStore,
  isSwitchingPersonasStore,
} from '$lib/stores/persona';
import { createOrReadSeed, deriveKeys } from '$lib/utils/keys-manager';
import { getConfig, getSalt } from '$lib/utils/config';

import { asyncDerived } from '@square/svelte-store';
import { derived } from 'svelte/store';
import { getBalancesXrpl } from '$lib/utils/wallet/xrplWallet';

// import { invoke } from '@tauri-apps/api/tauri';

let data = {
  salt: '',
  mnemonic: '',
  passPhrase: '',
  keys: {},
  id: -1,
};

// const getBalancesXrpl = async (asset, keys) => {
//   return {};
// };

export const getKeys = async (asset) => {
  // asset = xrpl:livenet
  if (!data) {
    return {};
  }
  const { keys } = data;
  const [network, chain] = asset.split(':');
  if (network === 'xrpl') {
    return keys[network][chain];
  }
};

export const walletStore = asyncDerived(
  activePersonaStore,
  async ($activePersona) => {
    // console.log('walletStore ap', $activePersona);
    if (!$activePersona.count) {
      // console.log('not initialized yet');
      return {}; // not initialized yet
    }
    // when the active persona changes, reset the wallet store
    if (data.id !== $activePersona.id) {
      isSwitchingPersonasStore.set(true);
      // console.log('regen keys');
      const config = await getConfig(true); // using cache
      const salt = await getSalt(true); // using cache

      data.passPhrase = config.passPhrase; // NB: not currently used
      data.salt = salt;

      let id = $activePersona.id;
      let passPhrase = data.passPhrase;
      let seed;
      try {
        seed = await createOrReadSeed({ salt, id, passPhrase, useCache: true });

        data.mnemonic = seed.mnemonic;
        // TODO: store this encrypted too to avoid the need to derive it
        const keys = await deriveKeys({
          mnemonic: seed.mnemonic,
          passPhrase,
          id,
          useCache: true,
        });
        data = { ...data, keys };
        data.id = id;
        console.log('walletStore', { data });
      } catch (e) {
        console.log({ e });
        alert(e.message);
      }
      isSwitchingPersonasStore.set(false);
    }
    // console.log('returning', data);
    return { ...data };
  }
);

export const getBalances = async (asset) => {
  // return {};
  // asset = xrpl:livenet
  if (!data) {
    return {};
  }
  const { keys } = data;

  const [network, chain] = asset.split(':');
  if (network === 'xrpl') {
    let xrplBalances = {};
    try {
      const params = data.keys[network][chain];
      xrplBalances = await getBalancesXrpl(asset, params);
    } catch (e) {
      console.log('getBalancesXrpl', { e });
      xrplBalances.message = e.message;
    }
    //    console.log('xrplBalances', xrplBalances);
    return xrplBalances;
  } else if (network === 'eth') {
    const ethBalances = {}; // await eth.getBalances(); TODO
    return ethBalances;
  }
};

//   return {
//     changeActivePersona: async ({ id = 0 }) => {
//       if (id === data.id) {
//         return;
//       }
//       const { mnemonic, passPhrase } = data;
//       const keys = await deriveKeys({
//         mnemonic,
//         passPhrase,
//         id,
//       });
//       data = { ...data, keys, id };
//       set(data);
//     },
//     init: async ({ id = 0, passPhrase = '' }) => {
//       if (initDone) {
//         console.log('using cached init');
//         return data;
//       }
//       const salt = (await invoke('get_salt')) || ''; // used to encrypt local seed data only

//       data.salt = salt;
//       data.passPhrase = passPhrase;
//       let seed;
//       try {
//         seed = await createOrReadSeed({ salt, id, passPhrase });

//         data.mnemonic = seed.mnemonic;

//         const keys = await deriveKeys({
//           mnemonic: seed.mnemonic,
//           passPhrase,
//           id,
//         });
//         // data.xrpl = xrpl;
//         // data.eth = eth;
//         // data.kudos = { address: eth.address }; // TEMP
//         data = { ...data, keys };
//         data.id = id;
//       } catch (e) {
//         console.log({ e });
//         alert(e.message);
//       }

//       // console.log({ data });
//       set(data);
//       initDone = true;
//       return data;
//     },
//     reset: async () => {
//       initDone = false;
//       data = {
//         salt: '',
//         mnemonic: '',
//         passPhrase: '',
//         keys: {},
//         id: 0,
//       };
//       set(data);
//     },
//     subscribe,
//     update,
//   };
// };

// export const walletStore = createWalletStore();
