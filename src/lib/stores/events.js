import { addEvents, readEvents } from '$lib/events/db';

import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createEventStore = () => {
  let data = {
    events: [],
    scope: '',
    startTs: new Date().toISOString(),
    count: 10,
  };
  const { subscribe, update, set } = writable(data);
  let initDone = false;

  return {
    init: async ({ scope, startTs, count }) => {
      if (initDone) return data;

      data.events = await readEvents({ scope, startTs, count });
      console.log('init', JSON.stringify(data.events));
      data.scope = scope;
      data.startTs = startTs;
      data.count = count;

      set(data);
      initDone = true;
      return data;
    },
    addEvent: async (event) => {
      console.log('addEvent', { event });
      await addEvents({ scope: data.scope, events: [event] });

      data.events.push(event);
      // sort
      data.events.sort((a, b) => a.ts - b.ts);

      set(data);
    },
    subscribe,
    update,
  };
};

export const eventsStore = createEventStore();
