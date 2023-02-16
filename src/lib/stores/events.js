// import { clearConfigStore } from '$lib/stores/clearConfig';
import { activePersonaStore } from '$lib/stores/persona';
import { addressStore } from '$lib/stores/address';
import { asyncDerived } from '@square/svelte-store';
import { readEvents } from '$lib/events/db';
import { scopeStore } from '$lib/stores/scope';
import { walletStore } from '$lib/stores/wallet';
import { writable } from 'svelte/store';

// window of events to grab at a time
export const countStore = writable(10);

export const lastUpdateStore = writable(new Date().toISOString());

export const cursorStore = writable({
  startTs: new Date().toISOString(),
  direction: 'head',
});

const starting = {
  address: '',
  direction: '',
  events: [],
  personaId: -1,
  scope: '',
  startTs: '',
  lastUpdate: '',
};
const current = { ...starting };

export const eventsStore = asyncDerived(
  [
    activePersonaStore,
    addressStore,
    countStore,
    cursorStore,
    scopeStore,
    walletStore,
    lastUpdateStore,
  ],
  async ([
    $activePersona,
    $address,
    $count,
    $cursor,
    $scope,
    $wallet,
    $lastUpdate,
  ]) => {
    // wait until we're ready
    if ($activePersona?.id === -1) {
      return { ...starting };
    }

    // see if we need to reload events
    if (
      $lastUpdate !== current.lastUpdate ||
      $activePersona.id !== current.personaId ||
      $scope !== current.scope ||
      $address !== current.address ||
      $cursor.startTs !== current.startTs ||
      $cursor.direction !== current.direction
    ) {
      // see if we're in a new scope or activePersona.id or address. If so, we need to zero the events.
      if (
        $activePersona.id !== current.personaId ||
        $scope !== current.scope ||
        $address !== current.address
      ) {
        current.events = [];
      }

      current.lastUpdate = $lastUpdate;
      current.personaId = $activePersona.id;
      current.scope = $scope;
      current.address = $address;
      current.startTs = $cursor.startTs;
      current.direction = $cursor.direction;
      console.log(
        'reading events!',
        $scope,
        $cursor.startTs,
        $cursor.direction
      );
      const readParams = {
        address: $address,
        channel: $scope,
        count: $count,
        direction: $cursor.direction,
        startTs: $cursor.startTs,
        includeEphemeral: true,
      };

      const newEvents = await readEvents(readParams);
      if (newEvents && newEvents.length) {
        console.log('new events-----', newEvents);
        // should be no more than count events, add to head or tail, then trim
        if ($cursor.direction === 'head') {
          console.log('adding to head', newEvents.length, $count);
          current.events = [...newEvents, ...current.events];
          current.events = current.events.slice(0, $count);
        } else {
          console.log('adding to tail', newEvents.length, $count);
          current.events = [...current.events, ...newEvents];
          // make sure events is always $count size, take from the end
          if (current.events.length > $count) {
            current.events = current.events.slice($count * -1);
          }
        }
      } else {
        // no new events
        console.log('no new events');
        current.events = [...current.events];
      }

      // make sure events are unique (TODO: bug in the above code)
      const eventIds = new Set(current.events.map((e) => e.id));
      // current.events should only contain unique eventIds, only one element in the events array per eventId
      current.events = current.events.filter((e) => {
        if (eventIds.has(e.id)) {
          eventIds.delete(e.id);
          return true;
        }
        return false;
      });

      // set the cursor
      if (current.events.length) {
        if ($cursor.direction === 'head') {
          current.startTs = current.events[0].ts;
        } else {
          current.startTs = current.events[current.events.length - 1].ts;
        }
      }
      console.log('events <=>', readParams, current);
      return current;
    }
  }
);

// export const createEventStoreOld = () => {
//   let data = {
//     events: [],
//     scope: '',
//     startTs: new Date().toISOString(),
//     count: COUNT,
//     id: -1,
//   };
//   const { subscribe, update, set } = writable(data);
//   let initDone = false;
//   let eventsAddress = '';

//   const init = async (
//     { scope, startTs, count, address, id },
//     forceInit = false
//   ) => {
//     if (!forceInit && initDone) {
//       return data;
//     }
//     eventsAddress = address || '0x0';

//     data.events = await readEvents({
//       address,
//       scope,
//       startTs,
//       count,
//       direction: 'earlier',
//     });
//     console.log('init', JSON.stringify(data.events));
//     data.scope = scope;
//     data.startTs = startTs;
//     data.count = count;
//     data.id = id;

//     set(data);
//     initDone = true;
//     return data;
//   };

//   return {
//     reInit: async (params) => {
//       console.log('reInit', params);
//       await init(params, true);
//     },
//     init,
//     loadMore: async ({ isTop, count }) => {
//       console.log('loadMore', data, isTop, count);

//       if (isTop) {
//         // adding more events to the top
//         // get the first event's timestamp
//         const firstEvent = data.events[0];
//         if (!firstEvent) {
//           return []; // no events
//         }

//         const moreEvents = await readEvents({
//           scope: firstEvent.scope, // ?
//           startTs: firstEvent.ts,
//           count: count || COUNT,
//           direction: 'earlier',
//           address: eventsAddress,
//         });
//         // make sure we don't add duplicates
//         // create a set of event ids which are unique
//         const eventIds = new Set(data.events.map((e) => e.id));
//         const uniqueEvents = moreEvents.filter((e) => !eventIds.has(e.id));

//         data.events = [...data.events, ...uniqueEvents];
//         set(data);
//         return uniqueEvents;
//       } else {
//         // adding more events to the bottom
//         // get the last event's timestamp
//         const lastEvent = data.events[data.events.length - 1];
//         if (!lastEvent) {
//           return [];
//         }

//         const moreEvents = await readEvents({
//           scope: lastEvent.scope, // ?
//           startTs: lastEvent.ts,
//           count: count || COUNT,
//           direction: 'asc',
//           address: eventsAddress,
//         });

//         // make sure we don't add duplicates
//         // create a set of event ids which are unique
//         const eventIds = new Set(data.events.map((e) => e.id));
//         const uniqueEvents = moreEvents.filter((e) => !eventIds.has(e.id));

//         data.events = [...data.events, ...uniqueEvents];
//         set(data);
//         return uniqueEvents;
//       }
//     },
//     ready: () => {
//       console.log('ready', initDone);
//       return initDone;
//     },
//     addEphemeralEvent: async (event) => {
//       // this doesn't save the event
//       data.events.push({
//         id: event.id,
//         channel: event.channel,
//         ts: event.ts,
//         ephemeral: true,
//         type: event.type,
//         event,
//       });

//       data.events.sort((a, b) => a.ts - b.ts);
//       data = data;
//       set(data);
//     },
//     addEvent: async (event) => {
//       console.log('addEvent', { event });

//       try {
//         await addEvents({
//           scope: data.scope,
//           events: [event],
//           address: eventsAddress,
//         });

//         // {
//         //    channel: "kudos",
//         //    event: {
//         //       body: {
//         //          from: "0x0b32B0Ded51fF30ef12FE1C3B23a692CaE6F4393",
//         //          message: "f"
//         //       },
//         //       channel: "kudos",
//         //       id: "Gph5JPVLp8bH1hHDoT5xaF",
//         //       ts: "2023-02-08T10:22:33.485Z",
//         //       type: "chat"
//         //    },
//         //    id: "Gph5JPVLp8bH1hHDoT5xaF",
//         //    ts: "2023-02-08T10:22:33.485Z",
//         //    type: "chat"
//         // }

//         data.events.push({
//           id: event.id,
//           channel: event.channel,
//           ts: event.ts,
//           type: event.type,
//           event,
//         });
//         // sort
//         data.events.sort((a, b) => a.ts - b.ts);
//       } catch (e) {
//         console.log('e', e);
//       }
//       data = data;
//       set(data);
//     },
//     reset: async () => {
//       initDone = false;
//       eventsAddress = '0x0';

//       data = {
//         events: [],
//         scope: '',
//         startTs: new Date().toISOString(),
//         count: COUNT,
//       };
//       set(data);
//     },
//     subscribe,
//     update,
//   };
// };

// export const eventsStore = createEventStore();
