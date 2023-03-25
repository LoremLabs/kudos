import { writable } from 'svelte/store';

// which scope to get events for, if this changes, events needs to be reloaded
export const scopeStore = writable('kudos');
