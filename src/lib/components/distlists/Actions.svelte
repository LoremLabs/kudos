<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import ModalConfirmDeleteDistList from '$lib/components/distlists/ModalConfirmDeleteDistList.svelte';

  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  import { getLog } from '$lib/distList/db';

  const dispatch = createEventDispatcher();

  let panelOpen: HTMLElement | null = null;

  export let utilsOpen = false;
  export let distList = {};
  export let status = {};
  export let distItems = {};
  export let activeCohort = '';
  export let cohortWeights = {};

  let cohortSelectOpen = false;
  let editDistListName = false;
  let showConfirmDeleteDistList = false;

  let confirmDeleteDistListPromise: Promise<void>;
  const confirmDeleteDistList = async () => {
    showConfirmDeleteDistList = true;
    let userData = await confirmDeleteDistListPromise;
    showConfirmDeleteDistList = false;
    return userData;
  };

  let ready = false;
  let originalDistList = {};

  function handleOutsideClick(ev: MouseEvent) {
    // if the click comes from the opener tree we do nothing, otherwise we close the menu
    if (!cohortSelectOpen) {
      return;
    }
    if (ev.target.closest('.opener')) {
      return;
    }
    cohortSelectOpen = false;
    ev.preventDefault();
  }
  function handleKeypress(ev: KeyboardEvent) {
    if (cohortSelectOpen && ev.key === 'Escape') {
      cohortSelectOpen = false;
      ev.preventDefault;
    }
  }

  onMount(async () => {
    originalDistList = { ...distList };
    ready = true;
  });
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

{#if ready}
  <div
    class="mr-3 rounded-t-2xl border-2 border-b-0 border-l-0 border-r-0 border-slate-50 bg-slate-50 dark:border-slate-400 dark:bg-slate-400"
  >
    <div
      class="items-justify-center flex h-16 items-center justify-end border-b border-gray-200 shadow-sm dark:border-slate-600"
    >
      <div
        class="mx-2 flex w-full flex-row items-center justify-start space-x-2 text-slate-900"
      >
        <div class="flex flex-row items-center justify-start">
          <ol class="ml-2 flex items-center space-x-2">
            <li>
              <div>
                <span class="text-sm font-bold text-slate-700">Dist List</span>
                <span class="ml-2 text-sm text-slate-700">&raquo;</span>
              </div>
            </li>
            <li>
              <div class="group flex w-full items-center hover:bg-white">
                <button
                  class="hover:underline"
                  on:click={() => {
                    editDistListName = true;
                  }}
                >
                  {#if !editDistListName}
                    <span>
                      {distList.name}
                    </span>
                  {:else}
                    <input
                      type="text"
                      spellcheck="false"
                      class="text-md w-full border-0 bg-transparent px-0 text-slate-700 focus:border-transparent focus:outline-none focus:ring-0 focus:ring-transparent"
                      bind:value={distList.name}
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          if (distList.name === '') {
                            distList.name =
                              originalDistList.name || 'New Dist List';
                          }
                          dispatch('action', {
                            action: 'distlist:edit',
                            params: { distList },
                          });

                          editDistListName = false;
                          e.preventDefault();
                        }
                      }}
                      on:blur={() => {
                        if (distList.name === '') {
                          distList.name =
                            originalDistList.name || 'New Dist List';
                        }
                        dispatch('action', {
                          action: 'distlist:edit',
                          params: { distList },
                        });

                        editDistListName = false;
                      }}
                    />
                  {/if}
                </button>
                <button
                  class="ml-2"
                  on:click={async () => {
                    const confirmedDelete = await confirmDeleteDistList();
                    if (!confirmedDelete) {
                      return;
                    }
                    dispatch('action', {
                      action: 'distlist:delete',
                      params: { distList },
                    });
                  }}
                >
                  <Icon
                    name="x"
                    class="h-3 w-3 opacity-0 group-hover:text-slate-500 group-hover:opacity-100"
                  />
                </button>
                {#if Object.keys(distItems).length && Object.keys(cohortWeights).length && cohortWeights[activeCohort]}
                  <span class="ml-2 text-sm text-slate-700">&raquo;</span>
                {/if}
              </div>
            </li>
            <li>
              {#if distItems && Object.keys(distItems).length}
                <div class="opener relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      class="group inline-flex w-full justify-center px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none"
                      aria-expanded="true"
                      aria-haspopup="true"
                      on:click={() => {
                        cohortSelectOpen = !cohortSelectOpen;
                      }}
                    >
                      {activeCohort}
                      <Icon
                        name="chevron-down"
                        class="mx-2 mt-1 h-3 w-3 opacity-0 group-hover:opacity-100"
                      />
                    </button>
                  </div>

                  <div
                    class="absolute right-0 z-40 mt-2 w-48 origin-top-right rounded-md bg-slate-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    class:hidden={!cohortSelectOpen}
                    class:animate-entering={cohortSelectOpen}
                    class:animate-leaving={!cohortSelectOpen}
                  >
                    <div class="py-1" role="none">
                      {#each Object.keys(distItems) as cohort}
                        <button
                          class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                          on:click={() => {
                            dispatch('action', {
                              action: 'distlist:selectCohort',
                              params: { cohort },
                            });
                            cohortSelectOpen = false;
                          }}>{cohort}</button
                        >
                      {/each}
                      <hr />
                      <button
                        class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                        on:click={() => {
                          dispatch('action', {
                            action: 'distlist:newCohort',
                            params: {},
                          });
                          cohortSelectOpen = false;
                        }}
                      >
                        <Icon name="plus" class="mr-2 h-3 w-3" />
                        New Cohort</button
                      >
                    </div>
                  </div>
                </div>
              {:else}
                <!--- ? -->
              {/if}
            </li>
          </ol>
        </div>
      </div>
      <div class="mx-2 flex flex-row text-gray-500">
        <button
          class="flex flex-row items-center justify-center rounded-full bg-cyan-800 p-2 px-4 text-cyan-50 hover:bg-cyan-700 hover:text-cyan-100 focus:outline-none"
        >
          Distribute
          <Icon name="arrow-sm-right" class="h-4 w-4" />
        </button>
        <button
          class="ml-4 rounded-full p-2 hover:bg-slate-300 focus:outline-none"
          class:bg-slate-200={status.showGraph}
          class:font-bold={status.showGraph}
          on:click={() => {
            status.showGraph = !status.showGraph;

            // if showHistory is active, turn it off
            if (status.showHistory) {
              status.showHistory = false;
            }

            dispatch('action', {
              action: 'distlist:showGraph',
              params: { status },
            });
          }}><Icon name="presentation-chart-line" class="h-6 w-6" /></button
        >
        <button
          class="mx-2 rounded-full p-2 hover:bg-slate-300 focus:outline-none"
          class:bg-slate-200={status.showHistory}
          class:font-bold={status.showHistory}
          on:click={async () => {
            const { log } = await getLog({ distList });
            status = {
              ...status,
              showHistory: !status.showHistory,
              history: log,
            };

            if (status.showGraph) {
              status.showGraph = false;
              dispatch('action', {
                action: 'distlist:showGraph',
                params: { status },
              });
            }

            dispatch('action', {
              action: 'distlist:showHistory',
              params: {},
            });
          }}
        >
          <Icon name="solid/list-bullet" class="h-6 w-6" />
        </button>
        <button
          class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
          class:bg-slate-200={utilsOpen}
          class:rotate-45={utilsOpen}
          on:click={() => {
            dispatch('action', { action: 'utils:add' });
          }}
        >
          <Icon name="solid/plus-sm" class="h-6 w-6" />
        </button>
      </div>
      {#if false}
        <div class="text-gray-500">
          <button
            id="panel-open-2"
            class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
            on:click={() => {
              panelOpen = document.getElementById('panel-open-2');
            }}
          >
            <Icon name="globe-alt" class="h-6 w-6" />
          </button>
        </div>

        <div class="mr-4 text-gray-500">
          <button
            id="panel-open"
            class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
            on:click={() => {
              panelOpen = document.getElementById('panel-open');
            }}
          >
            <Icon name="cog" class="h-6 w-6" />
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
<ModalConfirmDeleteDistList
  bind:open={showConfirmDeleteDistList}
  bind:done={confirmDeleteDistListPromise}
  handleCancel={() => {}}
  cancelActive={true}
>
  <div slot="header">
    <h3
      class="text-lg font-black leading-6 text-gray-900"
      id="del-modal-headline"
    >
      &nbsp;
    </h3>
  </div>
</ModalConfirmDeleteDistList>
