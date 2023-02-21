<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import KudosStartImport from '$lib/components/KudosStartImport.svelte';
  import ModalConfirmDeleteDistList from '$lib/components/distlists/ModalConfirmDeleteDistList.svelte';

  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  import { getLog } from '$lib/distList/db';

  const dispatch = createEventDispatcher();

  let panelOpen: HTMLElement | null = null;
  let panelImportOpen: HTMLElement | null = null;

  export let utilsOpen = false;
  export let distList = {};
  export let status = {};

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

  onMount(async () => {
    originalDistList = { ...distList };
    ready = true;
  });
</script>

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
              </div>
            </li>
          </ol>
        </div>
      </div>
      <div class="mx-2 flex flex-row text-gray-500">
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
            dispatch('action', {
              action: 'distlist:showHistory',
              params: { history: log },
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

    <Panel heading="Kudos Import" bind:opener={panelImportOpen}>
      <KudosStartImport />

      <div slot="footer">
        <button
          on:click={async () => {
            // save config
            console.log('saving config');
            panelImportOpen = null;
          }}
          type="submit"
          class="cursor-pointer rounded-full border border-gray-300 bg-gray-700 py-2
    px-4 text-sm font-medium text-white
    shadow-sm transition delay-150 ease-in-out hover:bg-blue-700
    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Close
        </button>
      </div>
    </Panel>
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
