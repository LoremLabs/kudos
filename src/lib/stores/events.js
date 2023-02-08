import { addEvents, readEvents } from '$lib/events/db';

// import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

const COUNT = 10;

export const createEventStore = () => {
  let data = {
    events: [],
    scope: '',
    startTs: new Date().toISOString(),
    count: COUNT,
  };
  const { subscribe, update, set } = writable(data);
  let initDone = false;

  return {
    init: async ({ scope, startTs, count }) => {
      if (initDone) return data;

      data.events = await readEvents({
        scope,
        startTs,
        count,
        direction: 'earlier',
      });
      console.log('init', JSON.stringify(data.events));
      data.scope = scope;
      data.startTs = startTs;
      data.count = count;

      set(data);
      initDone = true;
      return data;
    },
    loadMore: async ({ isTop, count }) => {
      console.log('loadMore', data, isTop, count);

      if (isTop) {
        // adding more events to the top
        // get the first event's timestamp
        const firstEvent = data.events[0];
        if (!firstEvent) {
          return []; // no events
        }

        const moreEvents = await readEvents({
          scope: firstEvent.scope, // ?
          startTs: firstEvent.ts,
          count: count || COUNT,
          direction: 'earlier',
        });
        // make sure we don't add duplicates
        // create a set of event ids which are unique
        const eventIds = new Set(data.events.map((e) => e.id));
        const uniqueEvents = moreEvents.filter((e) => !eventIds.has(e.id));

        data.events = [...data.events, ...uniqueEvents];
        set(data);
        return uniqueEvents;
      } else {
        // adding more events to the bottom
        // get the last event's timestamp
        const lastEvent = data.events[data.events.length - 1];
        if (!lastEvent) {
          return [];
        }

        const moreEvents = await readEvents({
          scope: lastEvent.scope, // ?
          startTs: lastEvent.ts,
          count: count || COUNT,
          direction: 'asc',
        });

        // make sure we don't add duplicates
        // create a set of event ids which are unique
        const eventIds = new Set(data.events.map((e) => e.id));
        const uniqueEvents = moreEvents.filter((e) => !eventIds.has(e.id));

        data.events = [...data.events, ...uniqueEvents];
        set(data);
        return uniqueEvents;
      }
    },
    ready: () => {
      console.log('ready', initDone);
      return initDone;
    },
    addEphemeralEvent: async (event) => {
      // this doesn't save the event
      data.events.push({
        id: event.id,
        channel: event.channel,
        ts: event.ts,
        ephemeral: true,
        type: event.type,
        event,
      });

      data.events.sort((a, b) => a.ts - b.ts);
      data = data;
      set(data);
    },
    addEvent: async (event) => {
      console.log('addEvent', { event });

      try {
        await addEvents({ scope: data.scope, events: [event] });

        // {
        //    channel: "kudos",
        //    event: {
        //       body: {
        //          from: "0x0b32B0Ded51fF30ef12FE1C3B23a692CaE6F4393",
        //          message: "f"
        //       },
        //       channel: "kudos",
        //       id: "Gph5JPVLp8bH1hHDoT5xaF",
        //       ts: "2023-02-08T10:22:33.485Z",
        //       type: "chat"
        //    },
        //    id: "Gph5JPVLp8bH1hHDoT5xaF",
        //    ts: "2023-02-08T10:22:33.485Z",
        //    type: "chat"
        // }

        data.events.push({
          id: event.id,
          channel: event.channel,
          ts: event.ts,
          type: event.type,
          event,
        });
        // sort
        data.events.sort((a, b) => a.ts - b.ts);
      } catch (e) {
        console.log('e', e);
      }
      data = data;
      set(data);
    },
    subscribe,
    update,
  };
};

export const eventsStore = createEventStore();
