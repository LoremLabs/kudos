<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';

  import { writable } from 'svelte/store';

  import Ago from '$lib/components/Ago.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  //import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { addToast } from '$lib/stores/toasts';
  //  import { activePersonaStore } from '$lib/stores/persona';

  import { addFileToDistList, getDistList } from '$lib/distList/db';

  import { fly } from 'svelte/transition';

  import Actions from './Actions.svelte';
  import KudosStartImport from './StartImport.svelte';
  // import JsPretty from '$lib/components/JSPretty.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;
  export let distList = {};

  let ready = false;
  let feedHeight = 0;
  let commanderHeight = 0; // disabled for here

  let distItems = writable({});
  let openKudos = {};

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

    const distListItems = await getDistList({ distList });
    console.log({ distListItems });
    distItems.set(distListItems);

    // if we don't have any items in the distlist, open utils
    if (distList && $distItems && Object.keys($distItems).length === 0) {
      utilsOpen = true;
    }

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';
    const params = e.detail?.params || {};

    switch (action) {
      case 'utils:add':
        utilsOpen = !utilsOpen;
        break;
      case 'kudos:import:file': {
        // import the kudos from the file
        const filePath = params.importFile;
        if (!filePath) {
          return; // TODO: add toast / error
        }
        let status = {};
        try {
          // add this to our dist list
          status = await addFileToDistList({
            distList,
            filePath,
          });

          if (status.inserted > 0) {
            addToast({
              type: 'success',
              msg: `${status.inserted || 0} imported`,
            });
          } else {
            addToast({
              type: 'warn',
              msg: `0 imported`,
            });
          }
        } catch (e) {
          console.log(e);
          addToast({
            type: 'error',
            msg: e.message || e,
          });
        }
        break;
      }
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
  let cohortClosed = {};
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
                <KudosStartImport on:action={onAction} />
              </div>
            {/if}
            {#if actionStatus.showHistory}
              <div
                class="m-4 flex overflow-hidden rounded-2xl bg-slate-200 px-8 pb-8 pt-4 shadow"
                in:fly={{ y: -20, duration: 400 }}
                out:fly={{ y: -20, duration: 200 }}
                bind:clientHeight={utilsHeight}
              >
                <div class="flex w-full flex-col">
                  <div class="flex flex-row items-center justify-between">
                    <div class="text-xl font-bold">List Events</div>
                  </div>
                  <div class="flex w-full flex-col">
                    {#each actionStatus.history as item}
                      <div class="flex flex-row items-center justify-between">
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {JSON.stringify(item)}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
            <div
              class="h-full"
              style={`height: 100%; max-height: ${feedHeight}px !important; min-height: ${feedHeight}px`}
            >
              <!-- iterate through each cohort of $distItems -->
              {#if $distItems && Object.keys($distItems).length}
                {#each Object.keys($distItems) as cohort}
                  <div class="divider-y-2 flex w-full flex-col">
                    <div class="flex flex-row items-center justify-between">
                      <div class="text23xl mx-4 font-mono font-bold">
                        <button
                          on:click={() => {
                            cohortClosed[cohort] = !cohortClosed[cohort];
                          }}
                        >
                          <div
                            class="flex flex-row items-center justify-center"
                          >
                            <Icon
                              name="mini/play"
                              class={`mx-1 h-2 w-2 text-slate-500 dark:text-slate-300 ${
                                cohortClosed[cohort] ? '' : 'rotate-90'
                              }`}
                            />
                            <span>{cohort}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                    {#if !cohortClosed[cohort]}
                      <div class="flex w-full flex-col">
                        <table
                          class="table-auto divide-y divide-gray-300"
                          class:animate-entering={!cohortClosed[cohort]}
                          class:animate-leaving={cohortClosed[cohort]}
                        >
                          <thead class="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                class="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                                >Date</th
                              >
                              <th
                                scope="col"
                                class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                                >Identifier</th
                              >
                              <th
                                scope="col"
                                class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                                >Weight</th
                              >
                              <th
                                scope="col"
                                class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                                >Description</th
                              >
                              <th
                                scope="col"
                                class="relative whitespace-nowrap py-3.5 pl-3 pr-4 sm:pr-6"
                              >
                                <span class="sr-only">More</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-200 bg-white">
                            {#each $distItems[cohort] as kudo, i}
                              <tr
                                class="cursor-pointer"
                                on:click={() => {
                                  openKudos[`k-${kudo.id}`] =
                                    !openKudos[`k-${kudo.id}`];
                                }}
                              >
                                <td
                                  class="whitespace-nowrap py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-6"
                                  ><Ago at={kudo.createTime} /></td
                                >
                                <td
                                  class="whitespace-nowrap px-2 py-2 text-sm font-medium text-gray-900"
                                  ><div title={kudo.id}>
                                    {kudo.identifier}
                                  </div></td
                                >
                                <td
                                  class="whitespace-nowrap px-2 py-2 text-sm text-gray-900"
                                  >{kudo.weight.toFixed(4)}</td
                                >
                                <td
                                  class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                                  ><div>
                                    {kudo.description}
                                  </div></td
                                >
                                <td
                                  class="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                                >
                                  <button
                                    class="text-cyan-600 hover:text-cyan-900"
                                    class:hidden={openKudos[`k-${kudo.id}`]}
                                    ><Icon name="eye" class="h-4 w-4" /></button
                                  >
                                </td>
                              </tr>
                              {#if openKudos[`k-${kudo.id}`]}
                                <tr
                                  class="cursor-pointer"
                                  on:click={() => {
                                    openKudos[`k-${kudo.id}`] =
                                      !openKudos[`k-${kudo.id}`];
                                  }}
                                >
                                  <td colspan="4" class="w-full">
                                    {#if kudo.context}
                                      <pre
                                        class="bg-slate-50 p-4 text-xs"><JSPretty
                                          obj={kudo}
                                        /><hr /><JSPretty
                                          obj={JSON.parse(kudo.context)}
                                        /></pre>
                                    {:else}
                                      -
                                    {/if}
                                  </td>
                                </tr>
                              {/if}
                            {/each}
                          </tbody>
                        </table>
                      </div>
                    {/if}
                  </div>
                {/each}
              {:else}
                <div
                  class="flex h-full flex-col items-center justify-center bg-slate-50"
                >
                  <div class="text-2xl text-gray-500 dark:text-gray-400">
                    No files in distribution list
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </LedgerPane>
  {/if}
{:else}
  <Waiting />
{/if}
