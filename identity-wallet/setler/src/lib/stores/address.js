import { derived, writable } from 'svelte/store';

import { scopeStore } from '$lib/stores/scope.js';
import { walletStore } from '$lib/stores/wallet.js';

// the current address of the persona id at scope
export const addressStore = derived(
  [walletStore, scopeStore],
  ([$walletStore, $scopeStore], set) => {
    // console.log('address');
    if (!$walletStore || !$walletStore.keys) {
      // console.log('no ws', $walletStore);
      return;
    }
    if (!$scopeStore) {
      // console.log('no scope');
      return;
    }
    const address = $walletStore.keys[$scopeStore]?.address;
    // console.log({ address });
    set(address);
  }
);
