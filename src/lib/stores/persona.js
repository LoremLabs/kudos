// derived store from clearConfigStore

import { derived, writable } from 'svelte/store';

import { clearConfigStore } from '$lib/stores/clearConfig.js';

export const isSwitchingPersonasStore = writable(false);

export const activePersonaStore = derived(clearConfigStore, ($clearConfig) => {
  console.log('d');
  if (!$clearConfig._init) {
    return {
      id: -1,
      count: 0,
    };
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

  return { ...active, count: $clearConfig?.personas.length || 0 }; // id and name
});
