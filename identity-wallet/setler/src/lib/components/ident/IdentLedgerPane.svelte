<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';

  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  import { walletStore } from '$lib/stores/wallet';
  // import { clearConfigStore } from '$lib/stores/clearConfig';
  import { activePersonaStore } from '$lib/stores/persona';

  import { fly } from 'svelte/transition';

  import Actions from './Actions.svelte';
  // import JsPretty from '$lib/components/JSPretty.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  let ready = false;
  let feedHeight = 0;
  let commanderHeight = 0; // disabled for here

  $: feedHeight =
    sidebarHeight -
    actionHeight -
    (utilsOpen ? utilsHeight : 0) -
    commanderHeight;

  onMount(async () => {
    if (!browser) {
      return;
    }

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';

    switch (action) {
      case 'utils:add':
        // utilsOpen = !utilsOpen;
        break;
      default:
        console.log('unknown action', action);
    }
  };
  let actionHeight = 0;
  let utilsHeight = 0;
  let utilsOpen = false;
  const onCommand = () => {
    dispatch('command');
  };
</script>

{#if ready}
  <LedgerPane
    {sidebarWidth}
    on:command={onCommand}
    on:action={onAction}
    showCommander={false}
  >
    <div slot="main" class="overflow-none w-full">
      <div class="flex w-full flex-col">
        <div id="inner-action" class="mt-2" bind:clientHeight={actionHeight}>
          <Actions on:action={onAction} bind:utilsOpen />
        </div>
        <div class="mr-3 bg-slate-50 dark:bg-slate-500">
          {#if utilsOpen}
            <div
              class="m-4 flex overflow-hidden rounded-2xl bg-slate-200 px-8 pb-8 pt-4 shadow"
              in:fly={{ y: -20, duration: 400 }}
              out:fly={{ y: -20, duration: 200 }}
              bind:clientHeight={utilsHeight}
            >
              huh
            </div>
          {/if}
          <div
            class="h-full"
            style={`height: 100%; max-height: ${feedHeight}px !important; min-height: ${feedHeight}px`}
          >
            <div class="h-48 bg-red-100">Ident here todo</div>
          </div>
        </div>
      </div>
    </div>
  </LedgerPane>
{:else}
  <Waiting />
{/if}
