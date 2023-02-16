// derived store from clearConfigStore

import { derived, writable } from 'svelte/store';

import { clearConfigStore } from '$lib/stores/clearConfig.js';

export const distLists = derived(clearConfigStore, ($clearConfig) => {
  if (!$clearConfig._init) {
    return [];
  }

  return $clearConfig.distLists || [];
});
