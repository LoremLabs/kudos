<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { writable } from 'svelte/store';

  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { addToast } from '$lib/stores/toasts';

  import Ago from '$lib/components/Ago.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';
  import EditableInput from '$lib/components/EditableInput.svelte';
  import Pill from '$lib/components/Pill.svelte';

  import ModalNewCohort from '$lib/components/ModalNewCohort.svelte';

  import { shortId } from '$lib/utils/short-id';

  import {
    addFileToDistList,
    changeDistListItems,
    getDistList,
    insertDistListItem,
    zeroDistListItems,
  } from '$lib/distList/db';

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
    // actionHeight -
    (utilsOpen || actionStatus.showHistory ? utilsHeight : 0) -
    commanderHeight;

  let clearConfig = {};
  let actionStatus = {};
  let openNewSegment = false;

  // if distList.id changes, we need to update the distItems
  $: distList?.id && updateDistListItems();

  const updateDistListItems = async () => {
    const distListItems = await getDistList({ distList });
    console.log({ distListItems });
    distItems.set(distListItems);

    utilsOpen = false;
    actionStatus.showHistory = false;
    // if we don't have any items in the distlist, open utils
    if (distList && $distItems && Object.keys($distItems).length === 0) {
      utilsOpen = true;
    }
  };

  onMount(async () => {
    if (!browser) {
      return;
    }

    clearConfig = await clearConfigStore.init();
    clearConfigStore.subscribe((config) => {
      clearConfig = config;
    });

    // const distListItems = await getDistList({ distList });
    // console.log({ distListItems });
    // distItems.set(distListItems);

    // // if we don't have any items in the distlist, open utils
    // if (distList && $distItems && Object.keys($distItems).length === 0) {
    //   utilsOpen = true;
    // }

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';
    const params = e.detail?.params || {};

    switch (action) {
      case 'utils:add':
        utilsOpen = !utilsOpen;
        // if (!utilsOpen && !actionStatus.showHistory) {
        //   utilsHeight = 0;
        // }
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
  let utilsHeightA = 0;
  let utilsHeightB = 0;

  // utilsHeight should always == utilsHeightA + utilsHeightB
  $: utilsHeight =
    (utilsOpen ? utilsHeightA : 0) +
    (actionStatus.showHistory ? utilsHeightB : 0);

  let editMode = false;
  let editingKudo;
  let insertBefore;

  let utilsOpen = false;
  let cohortClosed = {};
  const onCommand = () => {
    dispatch('command');
  };

  let newCohortModal = false;

  let newCohortPromise: Promise<void>;
  const newCohort = async () => {
    newCohortModal = true;
    let userData = await newCohortPromise;
    newCohortModal = false;
    return userData;
  };

  function handleOutsideClick(ev: MouseEvent) {
    if (
      !openKudos.menuOpened ||
      ev.target === openKudos.menuOpener ||
      !ev.target
    ) {
      return;
    }
    if (openKudos.menuOpener.contains(ev.target as Node)) {
      return;
    }
    // if (
    //   ev.target instanceof HTMLElement &&
    //   ev.target.classList.contains('backdrop')
    // ) {
    //   return;
    // }

    closeMenu();
    ev.preventDefault();
  }

  function closeMenu() {
    if (openKudos.menuOpened) {
      openKudos[`m-${openKudos.menuOpened}`] = false;
      openKudos.menuOpened = null;
      openKudos.menuOpener = null;
    }
  }

  function handleKeypress(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      closeMenu();
      ev.preventDefault;
    }
  }

  let lastClick = 0;
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

{#if ready}
  {#if !distList.id}
    <div class="flex h-full flex-col items-center justify-center bg-slate-50">
      <div class="text-2xl text-slate-500 dark:text-slate-400">
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
                bind:clientHeight={utilsHeightA}
              >
                <KudosStartImport on:action={onAction} />
              </div>
            {/if}
            {#if actionStatus.showHistory}
              <div
                class="m-4 flex overflow-hidden rounded-2xl bg-slate-200 px-2 pb-8 pt-4 shadow"
                in:fly={{ y: -20, duration: 400 }}
                out:fly={{ y: -20, duration: 200 }}
                bind:clientHeight={utilsHeightB}
              >
                <div
                  class="flex w-full flex-col"
                  style={`height: 100%; max-height: 500px !important; min-height: 500px`}
                >
                  <div class="flex flex-row items-center justify-between">
                    <div class="text-xl font-bold">List History</div>
                  </div>
                  <div class="flex w-full flex-col overflow-scroll">
                    <table class="divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            class="whitespace-nowrap py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-0"
                            >Action</th
                          >
                          <th
                            scope="col"
                            class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-gray-900"
                            >Description</th
                          >
                          <th
                            scope="col"
                            class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-gray-900"
                            >DistListId</th
                          >
                          <th
                            scope="col"
                            class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-gray-900"
                            >Id</th
                          >
                          <th
                            scope="col"
                            class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-gray-900"
                            >TraceId</th
                          >
                          <th
                            scope="col"
                            class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-gray-900"
                            >Ts</th
                          >
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-slate-50">
                        {#each actionStatus.history as item}
                          <tr>
                            <td
                              class="whitespace-nowrap py-2 pl-6 pr-3 text-xs text-gray-500 sm:pl-0"
                            >
                              <Pill type={item.action}>{item.action}</Pill>
                            </td>
                            <td
                              class="truncate whitespace-nowrap px-2 py-2 text-xs font-medium text-gray-900"
                              >{item.description}</td
                            >
                            <td
                              class="whitespace-nowrap px-2 py-2 text-xs text-gray-900"
                              >{item.distListId}</td
                            >
                            <td
                              class="whitespace-nowrap px-2 py-2 text-xs text-gray-500"
                              >{item.id}</td
                            >
                            <td
                              class="whitespace-nowrap px-2 py-2 text-xs text-gray-500"
                              >{item.traceId}</td
                            >
                            <td
                              class="whitespace-nowrap px-2 py-2 text-xs text-gray-500"
                              >{item.ts}</td
                            >
                          </tr>
                        {/each}
                        {#if actionStatus.history.length === 0}
                          <tr
                            ><td colspan="6"
                              ><h3
                                class="mt-2 text-sm font-medium text-gray-900"
                              >
                                No History Yet
                              </h3></td
                            ></tr
                          >
                        {/if}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            {/if}
            <div
              class="h-full overflow-scroll"
              style={`height: 100%; max-height: ${sidebarHeight}px !important; min-height: ${sidebarHeight}px`}
            >
              {#if $distItems && Object.keys($distItems).length}
                {#each Object.keys($distItems) as cohort}
                  <div class="divider-y-2 flex w-full flex-col bg-slate-100">
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
                      <div
                        class="flex flex-col overflow-scroll"
                        class:pb-24={utilsHeight < 1}
                        class:pb-96={utilsHeight > 1}
                        style={`height: 100%; max-height: ${
                          feedHeight - utilsHeight - 80
                        }px !important; min-height: ${
                          feedHeight - utilsHeight - 80
                        }px !important`}
                      >
                        <table
                          class="table-auto divide-y divide-slate-300"
                          class:animate-entering={!cohortClosed[cohort]}
                          class:animate-leaving={cohortClosed[cohort]}
                        >
                          <thead class="bg-slate-50">
                            <tr>
                              <th
                                scope="col"
                                class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-slate-900"
                                >Identifier</th
                              >
                              <th
                                scope="col"
                                class="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-slate-900 sm:pl-6"
                                >Date</th
                              >
                              <th
                                scope="col"
                                class="whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-slate-900"
                                >Weight</th
                              >
                              <th
                                scope="col"
                                class="truncate whitespace-nowrap px-2 py-3.5 text-left text-xs font-semibold text-slate-900"
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
                          <tbody class="divide-y divide-slate-200 bg-white">
                            {#if false}
                              <tr>
                                <td
                                  class="max-w-[400px] truncate whitespace-nowrap px-2 py-2 text-xs font-medium text-slate-900"
                                  ><div title="New Kudo">new</div>
                                </td>
                                <td
                                  class="whitespace-nowrap py-2 pl-4 pr-3 text-xs text-slate-500 sm:pl-6"
                                  ><Ago at={kudo.createTime} /></td
                                >
                                <td
                                  class="whitespace-nowrap px-2 py-2 text-xs text-slate-900"
                                >
                                  weight
                                </td>
                                <td
                                  class="max-w-[200px] truncate whitespace-nowrap px-2 py-2 text-xs text-slate-500"
                                  ><div
                                    title={kudo.description ||
                                      'New Kudo Description'}
                                  >
                                    desc
                                  </div>
                                </td>
                                <td />
                              </tr>
                            {/if}
                            {#each $distItems[cohort] as kudo, i}
                              {#if kudo && kudo.weight > 0}
                                <tr
                                  class:cursor-pointer={editMode}
                                  on:click={() => {
                                    if (editingKudo) {
                                      editMode = false;
                                      openKudos[`e-${editingKudo}`] = false;
                                    }
                                  }}
                                >
                                  <td
                                    class="max-w-[400px] truncate whitespace-nowrap px-2 py-2 text-xs font-medium text-slate-900"
                                    ><div title={kudo.id}>
                                      <EditableInput
                                        bind:isEditing={openKudos[
                                          `e-${kudo.id}`
                                        ]}
                                        bind:value={kudo.identifier}
                                        on:stopOtherEdit={async (e) => {
                                          // const action = e.detail?.action || '';
                                          // const params = e.detail?.params || {};
                                          try {
                                            await changeDistListItems({
                                              distList,
                                              items: [kudo],
                                            });

                                            addToast({
                                              msg: 'Saved.',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }

                                          editMode = false;
                                          openKudos[`e-${editingKudo}`] = false;
                                          editingKudo = null;
                                          editMode = false;
                                        }}
                                        on:startEdit={(e) => {
                                          const action = e.detail?.action || '';
                                          const params = e.detail?.params || {};

                                          console.log('turning on em');
                                          editMode = true;
                                          editingKudo = kudo.id;
                                          openKudos[`e-${kudo.id}`] = true;

                                          closeMenu();
                                        }}
                                        onBlur={async ({
                                          formerValue,
                                          value,
                                        }) => {
                                          if (!value || value.length === 0) {
                                            kudo.identifier = formerValue;
                                            return;
                                          }
                                          try {
                                            await changeDistListItems({
                                              distList,
                                              items: [kudo],
                                            });
                                            addToast({
                                              msg: 'Saved!',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }
                                          openKudos[`e-${kudo.id}`] = false;
                                          editingKudo = null;
                                          editMode = false;
                                        }}
                                        onKeydown={async (e) => {
                                          if (
                                            e.key === 'Escape' ||
                                            e.key === 'Enter'
                                          ) {
                                            try {
                                              await updateDistListItems({
                                                distList,
                                                items: [kudo],
                                              });
                                              addToast({
                                                msg: 'Saved!',
                                                type: 'success',
                                                duration: 2000,
                                              });
                                            } catch (e) {
                                              addToast({
                                                msg: e.message || e,
                                                type: 'error',
                                                duration: 5000,
                                              });
                                            }

                                            openKudos[`e-${kudo.id}`] = false;
                                            editingKudo = null;
                                            editMode = false;
                                            e.preventDefault();
                                          }
                                        }}
                                        ><div slot="show">
                                          {kudo.identifier}
                                        </div>
                                      </EditableInput>
                                    </div></td
                                  >
                                  <td
                                    class="whitespace-nowrap py-2 pl-4 pr-3 text-xs text-slate-500 sm:pl-6"
                                    ><Ago at={kudo.createTime} /></td
                                  >
                                  <td
                                    class="whitespace-nowrap px-2 py-2 text-xs text-slate-900"
                                  >
                                    <EditableInput
                                      bind:isEditing={openKudos[`e-${kudo.id}`]}
                                      value={kudo.weight}
                                      inputSize={5}
                                      on:stopOtherEdit={async (e) => {
                                        const action = e.detail?.action || '';
                                        const params = e.detail?.params || {};
                                        editMode = false;
                                        openKudos[`e-${editingKudo}`] = false;
                                        editingKudo = null;
                                        editMode = false;

                                        try {
                                          await changeDistListItems({
                                            distList,
                                            items: [kudo],
                                          });

                                          addToast({
                                            msg: 'Saved.',
                                            type: 'success',
                                            duration: 2000,
                                          });
                                        } catch (e) {
                                          addToast({
                                            msg: e.message || e,
                                            type: 'error',
                                            duration: 5000,
                                          });
                                        }
                                      }}
                                      on:startEdit={(e) => {
                                        const action = e.detail?.action || '';
                                        const params = e.detail?.params || {};

                                        console.log('turning on em');
                                        editMode = true;
                                        editingKudo = kudo.id;
                                        openKudos[`e-${kudo.id}`] = true;

                                        closeMenu();
                                      }}
                                      onBlur={async ({
                                        formerValue,
                                        value,
                                      }) => {
                                        // TODO: save to db
                                        // make sure we're a number and not a string

                                        try {
                                          console.log(
                                            'formerValue',
                                            formerValue,
                                            kudo.weight,
                                            value
                                          );
                                          const valueFloat = parseFloat(
                                            value || 0
                                          );
                                          if (
                                            value === '' ||
                                            valueFloat <= 0 ||
                                            isNaN(valueFloat)
                                          ) {
                                            kudo.weight = formerValue;
                                            addToast({
                                              type: 'info',
                                              msg: 'Weight must be greater than 0',
                                              duration: 5000,
                                            });
                                          } else {
                                            kudo.weight = valueFloat;
                                            //                                            await updateKudo(kudo);
                                          }
                                        } catch (e) {
                                          console.log('error', e);
                                          kudo.weight = formerValue;
                                          addToast({
                                            type: 'error',
                                            msg: e.message || e,
                                            duration: 5000,
                                          });
                                        }
                                        try {
                                          await changeDistListItems({
                                            distList,
                                            items: [kudo],
                                          });

                                          addToast({
                                            msg: 'Saved.',
                                            type: 'success',
                                            duration: 2000,
                                          });
                                        } catch (e) {
                                          addToast({
                                            msg: e.message || e,
                                            type: 'error',
                                            duration: 5000,
                                          });
                                        }

                                        openKudos[`e-${kudo.id}`] = false;
                                        editingKudo = null;
                                        editMode = false;
                                      }}
                                      ><div slot="show">
                                        {kudo.weight.toFixed(4)}
                                      </div>
                                    </EditableInput>
                                  </td>
                                  <td
                                    class="max-w-[200px] truncate whitespace-nowrap px-2 py-2 text-xs text-slate-500"
                                    ><div title={kudo.description}>
                                      <EditableInput
                                        bind:isEditing={openKudos[
                                          `e-${kudo.id}`
                                        ]}
                                        bind:value={kudo.description}
                                        on:stopOtherEdit={async (e) => {
                                          const action = e.detail?.action || '';
                                          const params = e.detail?.params || {};
                                          editMode = false;

                                          try {
                                            await changeDistListItems({
                                              distList,
                                              items: [kudo],
                                            });

                                            addToast({
                                              msg: 'Saved.',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }

                                          openKudos[`e-${editingKudo}`] = false;
                                          editingKudo = null;
                                          editMode = false;
                                        }}
                                        on:startEdit={(e) => {
                                          const action = e.detail?.action || '';
                                          const params = e.detail?.params || {};

                                          console.log('turning on em');
                                          editMode = true;
                                          editingKudo = kudo.id;
                                          openKudos[`e-${kudo.id}`] = true;

                                          closeMenu();
                                        }}
                                        onBlur={async () => {
                                          try {
                                            await changeDistListItems({
                                              distList,
                                              items: [kudo],
                                            });

                                            addToast({
                                              msg: 'Saved.',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }

                                          openKudos[`e-${kudo.id}`] = false;
                                          editingKudo = null;
                                          editMode = false;
                                        }}
                                        onKeydown={(e) => {
                                          if (
                                            e.key === 'Escape' ||
                                            e.key === 'Enter'
                                          ) {
                                            openKudos[`e-${kudo.id}`] = false;
                                            editingKudo = null;
                                            editMode = false;
                                            e.preventDefault();
                                          }
                                        }}
                                        ><div slot="show" class="">
                                          {kudo.description || '-'}
                                        </div>
                                      </EditableInput>
                                    </div></td
                                  >
                                  <td
                                    class="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-xs font-medium sm:pr-6"
                                  >
                                    <button
                                      class="text-cyan-600 hover:text-cyan-900"
                                      on:click|stopPropagation={(ev) => {
                                        if (editMode) {
                                          editMode = false;
                                          openKudos[`e-${editingKudo}`] = false;
                                          editingKudo = null;
                                        }
                                        if (openKudos.menuOpened) {
                                          closeMenu();
                                        } else {
                                          openKudos[`m-${kudo.id}`] = true;
                                          openKudos.menuOpened = kudo.id;
                                          openKudos.menuOpener = ev.target;
                                        }
                                      }}
                                      ><Icon
                                        name="mini/ellipsis-vertical"
                                        class="h-4 w-4"
                                      /></button
                                    >
                                    <div
                                      class="absolute right-2 -top-16 z-40 mt-2 w-48 origin-top-right rounded-md bg-slate-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                      role="menu"
                                      aria-orientation="vertical"
                                      aria-labelledby="user-menu-button"
                                      tabindex="-1"
                                      class:hidden={!openKudos[`m-${kudo.id}`]}
                                      class:animate-entering={openKudos[
                                        `m-${kudo.id}`
                                      ]}
                                      class:animate-leaving={!openKudos[
                                        `m-${kudo.id}`
                                      ]}
                                    >
                                      <button
                                        class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                                        id="user-menu-item-0"
                                        on:click|stopPropagation={() => {
                                          openKudos[`k-${kudo.id}`] =
                                            !openKudos[`k-${kudo.id}`];
                                          closeMenu();
                                        }}
                                      >
                                        <div class="w-6">
                                          <Icon
                                            name="document"
                                            class="mr-2 h-4 w-4"
                                          />
                                        </div>
                                        <div class="">Source Details</div>
                                      </button>
                                      <button
                                        class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                                        id="user-menu-item-0"
                                        on:click|stopPropagation={async () => {
                                          const traceId = shortId();
                                          const newKudo = {
                                            cohort,
                                            traceId,
                                            weight: 1,
                                            description: '',
                                            identifier:
                                              'email:matt@loremlabs.com',
                                            context: JSON.stringify({
                                              traceId,
                                              source: 'manual',
                                            }),
                                          };
                                          // add to the top of the list for this cohort
                                          try {
                                            await insertDistListItem({
                                              distList,
                                              cohort,
                                              item: newKudo,
                                            });
                                            updateDistListItems();

                                            addToast({
                                              msg: 'Created.',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }
                                          closeMenu();
                                        }}
                                      >
                                        <div class="w-6">
                                          <Icon
                                            name="mini/plus"
                                            class="mr-2 h-4 w-4"
                                          />
                                        </div>
                                        <div class="">Insert</div>
                                      </button>

                                      <button
                                        class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                                        id="user-menu-item-0"
                                        on:click|stopPropagation={() => {
                                          openKudos[`e-${kudo.id}`] = true; // turn on edit Mode
                                          editingKudo = kudo.id;
                                          editMode = true;
                                          closeMenu();
                                        }}
                                      >
                                        <div class="w-6">
                                          <Icon
                                            name="pencil"
                                            class="mr-2 h-4 w-4"
                                          />
                                        </div>
                                        <div class="">Edit</div>
                                      </button>
                                      <button
                                        class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                                        id="user-menu-item-0"
                                        on:click|stopPropagation={async () => {
                                          closeMenu();
                                          try {
                                            await zeroDistListItems(distList, [
                                              kudo.id,
                                            ]);
                                            addToast({
                                              msg: 'Deleted.',
                                              type: 'success',
                                              duration: 2000,
                                            });
                                          } catch (e) {
                                            addToast({
                                              msg: e.message || e,
                                              type: 'error',
                                              duration: 5000,
                                            });
                                          }
                                          updateDistListItems();
                                        }}
                                      >
                                        <div class="w-6">
                                          <Icon
                                            name="trash"
                                            class="mr-2 h-4 w-4"
                                          />
                                        </div>
                                        <div class="">Delete</div>
                                      </button>
                                    </div>
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
                                    <td
                                      colspan="5"
                                      class="w-full max-w-[100px] overflow-scroll"
                                    >
                                      {#if kudo.context}
                                        <pre
                                          class="whitespace-pre-wrap bg-slate-50 p-4 text-xs"><JSPretty
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
                  <div
                    class="m-auto mb-12 flex items-center justify-center text-2xl text-slate-500 dark:text-slate-400"
                  >
                    No files in distribution list
                  </div>
                </div>
              {/if}
              <div class="text-center">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    vector-effect="non-scaling-stroke"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">
                  Add a segment
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                  These allow you to segment your list by cohort or other
                  divisions.
                </p>
                <div class="mt-6">
                  <button
                    type="button"
                    class="inline-flex items-center rounded-full border border-transparent bg-cyan-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none"
                    on:click={async () => {
                      const segment = await newCohort();
                      const cohort = segment.cohort;
                      if (!cohort) {
                        return;
                      }
                      const traceId = shortId();

                      const newKudo = {
                        cohort,
                        traceId,
                        weight: 1,
                        description: '',
                        identifier: 'email:matt@loremlabs.com',
                        context: JSON.stringify({
                          traceId,
                          source: 'manual',
                        }),
                      };
                      // add to the top of the list for this cohort
                      try {
                        await insertDistListItem({
                          distList,
                          cohort,
                          item: newKudo,
                        });
                        updateDistListItems();

                        addToast({
                          msg: 'Created.',
                          type: 'success',
                          duration: 2000,
                        });
                      } catch (e) {
                        addToast({
                          msg: e.message || e,
                          type: 'error',
                          duration: 5000,
                        });
                      }
                    }}
                  >
                    <svg
                      class="-ml-1 mr-2 h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                      />
                    </svg>
                    New Segment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LedgerPane>
  {/if}
{:else}
  <Waiting />
{/if}
<ModalNewCohort
  bind:open={newCohortModal}
  bind:done={newCohortPromise}
  distItems={Object.keys($distItems)}
  handleCancel={() => {}}
>
  <div slot="header">
    <h3
      class="text-lg font-black leading-6 text-gray-900"
      id="modal-new-cohort"
    >
      &nbsp;
    </h3>
  </div>
</ModalNewCohort>
