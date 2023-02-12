// derived store from clearConfigStore

import { clearConfigStore } from '$lib/stores/clearConfig.js';
import { derived } from 'svelte/store';

export const activePersonaStore = derived(clearConfigStore, ($clearConfig) => {
  if (!$clearConfig._init) {
    return null;
  }
  if (!$clearConfig.personas) {
    return {
      id: 0,
      name: 'Persona 1',
      count: 1,
    };
  }

  let active = $clearConfig.personas.find((p) => p.active);
  if (!active) {
    active = $clearConfig.personas[0];
  }

  return { ...active, count: $clearConfig?.personas.length || 0 };
});
