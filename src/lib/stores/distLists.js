// derived store from clearConfigStore

import { clearConfigStore } from '$lib/stores/clearConfig.js';
import { derived } from 'svelte/store';

export const distLists = derived(clearConfigStore, ($clearConfig) => {
  if (!$clearConfig._init) {
    return [];
  }

  return $clearConfig.distLists || [];
});
