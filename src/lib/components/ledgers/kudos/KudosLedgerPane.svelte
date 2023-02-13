<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';

  import { shortId } from '$lib/utils/short-id';
  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { eventsStore } from '$lib/stores/events';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { activePersonaStore } from '$lib/stores/persona';

  import KudosStartImport from '$lib/components/KudosStartImport.svelte';

  import { fly } from 'svelte/transition';

  import Actions from './Actions.svelte';
  import Feed from './Feed.svelte';
  // import JsPretty from '$lib/components/JSPretty.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  const DEBUG_WALLET_STORE = false;

  let activePersonaId = 0;
  let feedHeight = 0;
  let actionHeight = 0;
  let utilsHeight = 0;
  let ready = false;
  let utilsOpen = false;
  let currentPersonaId = 0;

  onMount(async () => {
    if (!browser) {
      return;
    }

    const config = await getConfig(true); // using cached config
    await eventsStore.init({
      scope: 'kudos',
      count: 10,
      startTs: new Date().toISOString(),
      address: $walletStore.keys?.kudos?.address,
      id: activePersonaId, // 0 on init
    });

    activePersonaStore.subscribe(async (persona) => {
      if (persona?.id != activePersonaId) {
        console.log('change persona events', persona?.id, activePersonaId);
        await eventsStore.reInit({
          scope: 'kudos',
          count: 10,
          startTs: new Date().toISOString(),
          address: $walletStore.keys?.kudos?.address,
          id: persona.id,
          events: [],
        });

        activePersonaId = persona?.id;
      }
    });

    // detect if we have no events, and if so set utilsOpen to true
    if ($eventsStore.events.length === 0) {
      utilsOpen = true;
    }

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';

    switch (action) {
      case 'utils:add':
        utilsOpen = !utilsOpen;
        break;
      default:
        console.log('unknown action', action);
    }
  };

  const onCommand = async (e: CustomEvent) => {
    let { command } = e.detail || { command: '' };
    let slashCommand = '';
    if (command.startsWith('/')) {
      slashCommand = command.substring(1);
      command = '';

      const helpEvent = {
        ts: new Date().toISOString(),
        id: shortId(),
        type: 'help',
        channel: 'kudos',
        ephemeral: true,
        body: {
          from: '0x0',
          message: `\`\`\`Javascript
      :smile: Kudos

      /help - this help
      /kudos - show kudos
      /kudos [name] - show kudos for [name]
      /kudos [name] [amount] - give [amount] kudos to [name]
      /kudos [name] [amount] [reason] - give [amount] kudos to [name] for [reason]
\`\`\`
      `,
        },
      };
      eventsStore.addEphemeralEvent(helpEvent);
      return;
    }

    if (command) {
      console.log('should do chat', command);

      if (!eventsStore.ready()) {
        console.error('eventsStore not ready');
        return;
      }

      //       [event.id, event.type, event.channel, JSON.stringify(event), event.ts]

      await eventsStore.addEvent({
        ts: new Date().toISOString(),
        id: shortId(),
        type: 'chat',
        channel: 'kudos',
        body: {
          from: $walletStore.keys.kudos?.address,
          message: command,
        },
      });

      // ledgerParts.push({
      //   _ts: new Date().toISOString(),
      //   _id: shortId(),
      //   _type: 'chat',
      //   _from: $walletStore.keys.kudos?.address,
      //   _message: command,
      //   _source: 'kudos',
      //   _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
      //   _sourceType: 'kudos',
      //   _sourceName: 'Kudos',
      // });

      //      ledgerParts = ledgerParts; // update
    }
  };

  const loadMore = async (isTop) => {
    // request the store to load more events, from isTop = top, or bottom
    return await eventsStore.loadMore({ isTop, count: 10 });
  };

  // on window resize, recalculate the height of actions (due to svelte bug, to get the tooltips and command to work)
  // window.addEventListener('resize', () => {
  //   const action = document.getElementById('inner-action');
  //   if (action) {
  //     actionHeight = action.clientHeight;
  //   }
  // });

  // ledgerParts = [
  //   {
  //     // get current iso date
  //     _ts: new Date().toISOString(),
  //     _id: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _type: 'kudos',
  //     _source: 'kudos',
  //     _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _sourceType: 'kudos',
  //     _sourceName: 'Kudos',
  //   },
  //   {
  //     _ts: new Date().toISOString(),
  //     _id: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _type: 'kudos3',
  //     _source: 'kudos',
  //     _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _sourceType: 'kudos',
  //     _sourceName: 'Kudos',
  //   },
  //   {
  //     _ts: new Date('2021-03-03').toISOString(),
  //     _id: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _type: 'kudos2',
  //     _source: 'kudos',
  //     _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
  //     _sourceType: 'kudos',
  //     _sourceName: 'Kudos',
  //   },
  // ];

  $: feedHeight =
    sidebarHeight - actionHeight - (utilsOpen ? utilsHeight : 0) - 100;
</script>

{#if ready}
  <LedgerPane {sidebarWidth} on:command={onCommand} on:action={onAction}>
    <div slot="main" class="overflow-none w-full">
      <div class="flex w-full flex-col">
        <div id="inner-action" class="mt-2" bind:clientHeight={actionHeight}>
          <Actions
            walletStore={$walletStore}
            on:action={onAction}
            bind:utilsOpen
          />
        </div>
        <div class="mr-3 bg-white">
          {#if DEBUG_WALLET_STORE}
            <pre class="pre-wrap my-12 text-xs">{JSON.stringify(
                $walletStore,
                null,
                2
              )}</pre>
          {/if}
          {#if utilsOpen}
            <div
              class="m-auto m-4 flex overflow-hidden rounded-2xl bg-slate-200 px-8 pb-8  pt-4 shadow"
              in:fly={{ y: -20, duration: 400 }}
              out:fly={{ y: -20, duration: 200 }}
              bind:clientHeight={utilsHeight}
            >
              <KudosStartImport />
            </div>
          {/if}
          <Feed {feedHeight} feed={$eventsStore?.events || []} {loadMore} />
        </div>
      </div>
    </div>
  </LedgerPane>
{:else}
  <Waiting />
{/if}
