import { persisted } from 'svelte-local-storage-store';

export const prefs = persisted('prefs', {
  activeSection: 'Kudos',
  activeDistList: '',
  distributionsListOpen: true,
});
