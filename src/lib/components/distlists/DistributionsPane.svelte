<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';

  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { activePersonaStore } from '$lib/stores/persona';

  import { fly } from 'svelte/transition';

  import Actions from './Actions.svelte';
  // import JsPretty from '$lib/components/JSPretty.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;
  export let distList = {};

  let ready = false;
  let feedHeight = 0;
  let commanderHeight = 0; // disabled for here

  $: feedHeight =
    sidebarHeight -
    actionHeight -
    (utilsOpen ? utilsHeight : 0) -
    commanderHeight;

  let clearConfig = {};
  let actionStatus = {};

  onMount(async () => {
    if (!browser) {
      return;
    }

    clearConfig = await clearConfigStore.init();
    clearConfigStore.subscribe((config) => {
      clearConfig = config;
    });

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';
    const params = e.detail?.params || {};

    switch (action) {
      case 'distlist:delete': {
        // delete this distlist
        const thisDistList = params.distList || {};
        clearConfig.distLists = clearConfig.distLists || [];
        const distListIndex = clearConfig.distLists.findIndex(
          (dl) => dl.id === thisDistList.id
        );
        if (distListIndex === -1) {
          // clearConfig.distLists.push(distList);
          // throw new Error('distlist not found');
          return; // TODO: add toast / error
        } else {
          clearConfig.distLists.splice(distListIndex, 1);
        }

        // save the distlist to clearConfig
        await clearConfigStore.save(clearConfig);

        // move the current distlist to the next one
        const nextDistList =
          clearConfig.distLists[distListIndex % clearConfig.distLists.length];
        if (nextDistList) {
          distList = nextDistList;
        } else {
          distList = {};
        }

        break;
      }
      case 'distlist:edit': {
        // save the distlist to clearConfig
        const thisDistList = params.distList || {};
        clearConfig.distLists = clearConfig.distLists || [];
        const distListIndex = clearConfig.distLists.findIndex(
          (dl) => dl.id === thisDistList.id
        );
        if (distListIndex === -1) {
          // clearConfig.distLists.push(distList);
          // throw new Error('distlist not found');
          return; // TODO: add toast / error
        } else {
          // make sure we have a name
          if (!thisDistList.name) {
            // throw new Error('distlist name is required');
            return;
          }
          // TODO: check for duplicate name
          clearConfig.distLists[distListIndex] = thisDistList;
        }
        // sort by name (case insensitive)
        clearConfig.distLists.sort((a, b) => {
          const nameA = a.name.toUpperCase();
          const nameB = b.name.toUpperCase();
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });

        await clearConfigStore.save(clearConfig);
        break;
      }
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
  {#if !distList.id}
    <div class="flex h-full flex-col items-center justify-center bg-slate-50">
      <div class="text-2xl text-gray-500 dark:text-gray-400">
        No distribution list selected
      </div>
    </div>
  {:else}
    <LedgerPane
      {sidebarWidth}
      on:command={onCommand}
      on:action={onAction}
      showCommander={false}
    >
      <div slot="main" class="overflow-none w-full">
        <div class="flex w-full flex-col">
          <div id="inner-action" class="mt-2" bind:clientHeight={actionHeight}>
            <Actions
              on:action={onAction}
              bind:utilsOpen
              {distList}
              bind:status={actionStatus}
            />
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
              Ident here todo
            </div>
          </div>
        </div>
      </div>
    </LedgerPane>
  {/if}
{:else}
  <Waiting />
{/if}
