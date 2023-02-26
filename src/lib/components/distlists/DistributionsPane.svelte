<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { writable, derived } from 'svelte/store';

  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { addToast } from '$lib/stores/toasts';

  import Ago from '$lib/components/Ago.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';
  import EditableInput from '$lib/components/EditableInput.svelte';
  import Pill from '$lib/components/Pill.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';

  import ModalNewCohort from '$lib/components/ModalNewCohort.svelte';
  import ModalStartFameDistribution from '$lib/components/ModalStartFameDistribution.svelte';
  import Sankey from '$lib/components/Sankey.svelte';

  import { shortId } from '$lib/utils/short-id';
  import { decorateDistList } from '$lib/distList/payVia.js';

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
  export let fundingAmount = 1000; // cents

  let ready = false;
  let feedHeight = 0;
  let commanderHeight = 0; // disabled for here

  let showGraph = false;
  let settle = false;
  let highlightLinkIndexes = [];

  let distItems = writable({});
  let openKudos = {};

  let activeCohort = '';
  let activeCohorts = {};

  let editAmount = false;

  $: feedHeight =
    sidebarHeight -
    // actionHeight -
    (utilsOpen || actionStatus.showHistory ? utilsHeight : 0) -
    commanderHeight;

  let clearConfig = {};
  let actionStatus = {};

  let width = 50;
  let nodePadding = 7;
  let nodeAlign = 'left';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  const fundingAmountStore = writable(fundingAmount);

  // ([$walletStore, $scopeStore], set) => {

  const graph = derived(
    [distItems, fundingAmountStore],
    ([$cohorts, $fundingAmount], set) => {
      let data = {
        nodes: [{ name: `${formatter.format($fundingAmount / 100)}` }],
        links: [],
        totalWeight: 0,
        totalDistribution: 0,
      };

      let kudos = [];
      Object.keys($cohorts).forEach((cohort) => {
        kudos = [...kudos, ...$cohorts[cohort]];
      });
      // console.log({ kudos });

      // filter kudos with 0 weight
      kudos = kudos.filter((kudo) => kudo.weight > 0);

      // add all the possible nodes first
      let weights = {};
      let totalWeight = 0;
      let totalDistribution = 0;

      // STEP 1: calculate weights
      kudos.forEach((kudo) => {
        weights[kudo.identifier] =
          (weights[kudo.identifier] || 0) + kudo.weight;
        weights[kudo.traceId] = (weights[kudo.traceId] || 0) + kudo.weight;
        totalWeight += kudo.weight;
      });

      // STEP 2: calculate trace nodes and links
      kudos.forEach((kudo) => {
        if (!data.nodes.find((node) => node.name === kudo.identifier)) {
          data.nodes.push({ name: kudo.identifier });
        }
        if (!data.nodes.find((node) => node.name === kudo.traceId)) {
          data.nodes.push({ name: kudo.traceId });
        }

        // source -> traceId -> identifier
        const source = 0;
        const target = data.nodes.findIndex(
          (node) => node.name === kudo.traceId
        );
        const share = weights[kudo.traceId] / totalWeight;
        const share2 = kudo.weight / weights[kudo.traceId];

        // only push the link if it doesn't already exist
        if (
          !data.links.find(
            (link) => link.source === source && link.target === target
          )
        ) {
          const value = share * $fundingAmount;
          totalDistribution += value;
          data.links.push({ source, target, value });
        }
        const target2 = data.nodes.findIndex(
          (node) => node.name === kudo.identifier
        );
        if (
          !data.links.find(
            (link) => link.source === target && link.target === target2
          )
        ) {
          const value = (kudo.weight / totalWeight) * $fundingAmount;
          //        totalDistribution += value;
          data.links.push({
            source: target,
            target: target2,
            value,
          });
        }
      });
      data = {
        ...data,
        // nodes: [...graph.nodes],
        // links: [...graph.links],
        totalWeight,
        totalDistribution,
      };
      console.log({ data });
      set(data);
      return data;
    }
  );

  const cohortWeights = derived(distItems, ($cohorts) => {
    // return a map cohortId => totalWeight of all items in that cohort
    const weights = {};
    Object.keys($cohorts).forEach((cohort) => {
      // for each $cohorts[cohort], add up the weights
      const kudos = $cohorts[cohort];
      kudos.forEach((kudo) => {
        if (!weights[cohort]) {
          weights[cohort] = 0;
        }
        if (kudo.weight) {
          weights[cohort] += kudo.weight;
        }
      });
    });
    return weights;
  });

  // if distList.id changes, we need to update the distItems
  $: distList?.id && updateDistListItems();

  const updateDistListItems = async () => {
    const distListItems = await getDistList({ distList });
    // console.log({ distListItems });

    // calculate the totalWeight so we know when the list is effectively empty
    let totalWeight = 0;
    let firstCohort = '';
    let cohorts = Object.keys(distListItems);
    // sorted cohorts
    cohorts = cohorts.sort((a, b) => {
      if (a > b) {
        return -1;
      }
      if (a < b) {
        return 1;
      }
      return 0;
    });

    cohorts.forEach((cohort) => {
      totalWeight += distListItems[cohort].weight || 0;
    });
    // set the active cohort to be the current one, or the first one
    const cohort = distList?.id;
    if (!activeCohorts[cohort]) {
      activeCohort = cohorts[0];
      activeCohorts[cohort] = activeCohort;
    } else {
      activeCohort = activeCohorts[cohort];
    }

    // decorate the distList with payVia indication
    try {
      await decorateDistList({ distItems: distListItems[activeCohort] });
    } catch (e) {
      console.log(e);
    }
    distItems.set(distListItems);

    // reset dist state TODO:refactor
    utilsOpen = false;
    actionStatus.showHistory = false;
    actionStatus.showGraph = false;
    showGraph = false;
    settle = false;

    // if we don't have any items in the distlist, open utils
    if (distList && $distItems && Object.keys($distItems).length === 0) {
      utilsOpen = true;
    }
  };

  const selectCohort = (cohort: string) => {
    activeCohort = cohort;
    activeCohorts[distList.id] = cohort;
  };

  onMount(async () => {
    if (!browser) {
      return;
    }

    clearConfig = await clearConfigStore.init();
    clearConfigStore.subscribe((config) => {
      clearConfig = config;
    });

    //    activeCohort = clearConfig.activeCohort || '';

    ready = true;
  });

  const fameDistribution = async () => {
    const distributionStatus = await startFameDistribution();
  };

  const createNewCohort = async () => {
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
      identifier: 'did:url:https://www.loremlabs.com',
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
    selectCohort(cohort);
  };

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';
    const params = e.detail?.params || {};

    switch (action) {
      case 'kudos:import:close': {
        utilsOpen = false;
        break;
      }
      case 'utils:add':
        utilsOpen = !utilsOpen;
        // if (!utilsOpen && !actionStatus.showHistory) {
        //   utilsHeight = 0;
        // }
        break;
      case 'distlist:distribute': {
        settle = !settle;
        if (settle && showGraph) {
          showGraph = false;
          actionStatus.showGraph = false;
        }
        break;
      }
      case 'distlist:showHistory': {
        break;
      }
      case 'distlist:newCohort': {
        createNewCohort();
        break;
      }
      case 'distlist:selectCohort': {
        // select a cohort
        const cohort = params.cohort || '';
        selectCohort(cohort);
        break;
      }
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

          updateDistListItems();

          if (status.inserted > 0) {
            addToast({
              type: 'success',
              msg: `${status.inserted || 0} imported`,
              duration: 4000,
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
      case 'distlist:showGraph': {
        showGraph = !showGraph;
        if (showGraph && settle) {
          settle = false;
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

  let fameDistributionModal = false;

  let fameDistributionPromise: Promise<void>;
  const startFameDistribution = async () => {
    fameDistributionModal = true;
    let status = await fameDistributionPromise;
    fameDistributionModal = false;
    return status;
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
      <div slot="main" class="overflow-none w-full" bind:clientWidth={width}>
        <div class="flex w-full flex-col">
          <div id="inner-action" class="mt-2" bind:clientHeight={actionHeight}>
            <Actions
              on:action={onAction}
              bind:utilsOpen
              {distList}
              {activeCohort}
              distItems={$distItems}
              cohortWeights={$cohortWeights}
              bind:status={actionStatus}
            />
          </div>
          <div class="mr-3 bg-slate-50 px-3 dark:bg-slate-500">
            {#if settle}
              <div class="my-8 bg-white shadow dark:bg-slate-300 sm:rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3
                    class="text-lg font-medium leading-6 text-gray-900"
                    id="settles-label"
                  >
                    Send a Public Thanks
                  </h3>
                  <div class="mt-2 sm:flex sm:items-start sm:justify-between">
                    <div class="max-w-xl text-sm text-gray-500">
                      <p id="settles-description">
                        Kudos can be published to a global leader board. This
                        will give attention to the people who are contributing
                        the most to your community.
                      </p>
                    </div>
                    <div
                      class="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center"
                    >
                      <button
                        type="button"
                        class="inline-flex items-center rounded-full border border-transparent bg-gray-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm"
                        on:click={async () => {
                          // modal
                          await fameDistribution();
                        }}>Start Publicize</button
                      >
                    </div>
                  </div>
                </div>
              </div>
              <div class="my-8 bg-white shadow dark:bg-slate-300 sm:rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <div class="sm:flex sm:items-start sm:justify-between">
                    <div>
                      <h3 class="text-lg font-medium leading-6 text-gray-900">
                        Transfer Money to Your List
                      </h3>
                      <div class="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          This will allow you to send money to your contributors
                          in proportion with their weight in this list. You set
                          a price and we split it between your contributors.
                        </p>
                      </div>
                    </div>
                    <div
                      class="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center"
                    >
                      <button
                        type="button"
                        class="inline-flex items-center rounded-full border border-transparent bg-gray-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm"
                        >Start Transfer</button
                      >
                    </div>
                  </div>
                </div>
              </div>
            {:else if showGraph}
              {#if $graph}
                <div class="mt-4 scale-[1] dark:bg-slate-200">
                  <h2 class="my-4 text-xl font-bold text-gray-900">
                    Distribution Graph
                  </h2>
                  {#if $graph.totalWeight > 0}
                    <div class="flex items-center justify-between">
                      <div class="flex flex-row text-xs text-gray-500">
                        <Tooltip
                          text={`Share is determined by individual weight / total weight of the list.`}
                          placement="right"
                          class="z-50 z-50 border border-slate-300 p-1.5 px-2 shadow"
                        >
                          <div class="flex flex-row text-xs text-gray-500">
                            <Icon name="mini/scale" class="mr-2 h-5 w-5" />
                            {$graph.totalWeight.toFixed(4)}
                          </div>
                        </Tooltip>
                      </div>
                      <div class="flex flex-row text-xs text-gray-500">
                        <div
                          class="group flex w-full items-center hover:bg-white"
                        >
                          {#if !editAmount}
                            <Tooltip
                              text={`Total distribution amount finalized at a later step. Click to model distribution scenarios.`}
                              placement="right"
                              class="z-50 z-50 border border-slate-300 p-1.5 px-2 shadow"
                            >
                              <button
                                class="hover:underline"
                                on:click={() => {
                                  editAmount = true;
                                }}
                              >
                                <div
                                  class="flex flex-row text-xs text-gray-500"
                                >
                                  <Icon
                                    name="currency-dollar"
                                    class="mr-2 h-5 w-5"
                                  />
                                  {formatter.format(
                                    $graph.totalDistribution / 100
                                  )}
                                </div>
                              </button>
                            </Tooltip>
                          {:else}
                            <input
                              type="currency"
                              spellcheck="false"
                              class="text-md w-full border-0 bg-transparent p-1 text-slate-700 focus:border-transparent focus:outline-none focus:ring-0 focus:ring-transparent"
                              bind:value={fundingAmount}
                              on:keydown={(e) => {
                                // remove non-numeric characters
                                if (isNaN(fundingAmount)) {
                                  fundingAmount = 100;
                                }
                                fundingAmount = parseInt(
                                  `${fundingAmount}`.replace(/[^0-9.]/g, ''),
                                  10
                                );
                                if (e.key === 'Enter') {
                                  if (fundingAmount <= 0) {
                                    fundingAmount = 100;
                                  }
                                  fundingAmountStore.set(fundingAmount);

                                  editAmount = false;
                                  e.preventDefault();
                                }
                              }}
                              on:blur={() => {
                                if (fundingAmount <= 0) {
                                  fundingAmount = 100;
                                }
                                fundingAmountStore.set(fundingAmount);

                                editAmount = false;
                              }}
                            />
                          {/if}
                        </div>
                      </div>
                    </div>
                    <div class="">
                      <Sankey
                        graph={$graph}
                        {width}
                        height={width}
                        {nodePadding}
                        {nodeAlign}
                        bind:highlightLinkIndexes
                        extent={[
                          [1, 1],
                          [width - 1, sidebarHeight * 0.9 - 6],
                        ]}
                      />
                    </div>
                  {:else}
                    <div
                      class="flex h-full flex-col items-center justify-center bg-slate-50"
                      style="height: 400px"
                    >
                      <div class="text-2xl text-slate-500 dark:text-slate-400">
                        No graph data
                      </div>
                    </div>
                  {/if}
                </div>
              {:else}
                <div
                  class="flex h-full flex-col items-center justify-center bg-slate-50"
                >
                  <div class="text-2xl text-slate-500 dark:text-slate-400">
                    No graph data
                  </div>
                </div>
              {/if}
            {/if}
            {#if utilsOpen}
              <div
                class="my-4 flex overflow-hidden rounded-2xl bg-slate-200 px-8 pb-8 pt-4 shadow"
                in:fly={{ y: -20, duration: 400 }}
                out:fly={{ y: -20, duration: 200 }}
                bind:clientHeight={utilsHeightA}
              >
                <KudosStartImport on:action={onAction} showClose={true} />
              </div>
            {/if}
            {#if actionStatus.showHistory}
              <div
                class="my-4 flex overflow-hidden rounded-2xl bg-slate-200 px-2 pb-8 pt-4 shadow"
                in:fly={{ y: -20, duration: 400 }}
                out:fly={{ y: -20, duration: 200 }}
                bind:clientHeight={utilsHeightB}
              >
                <div
                  class="flex w-full flex-col"
                  style={`height: 100%; max-height: 500px !important; min-height: 500px`}
                >
                  <div class="mx-2 flex flex-row items-center justify-between">
                    <div class="text-xl font-bold">List History</div>
                    <button
                      class="rounded-full bg-slate-100 p-2"
                      on:click={() => {
                        actionStatus.showHistory = false;
                      }}
                    >
                      <Icon
                        name="x"
                        class="h-4 w-4 text-slate-800 hover:text-black"
                      />
                    </button>
                  </div>
                  <div class="mx-2 flex w-full flex-col overflow-scroll">
                    <table class="mr-4 divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            class="whitespace-nowrap py-3.5 pr-3 pl-0 text-left text-xs font-semibold text-gray-900"
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
                  {#if cohort === activeCohort}
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
                      {#if $cohortWeights[cohort]}
                        <table
                          class="mt-3 table-auto divide-y divide-slate-300 dark:divide-slate-600"
                        >
                          <thead class="bg-slate-50 dark:bg-slate-400">
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
                          <tbody
                            class="divide-y divide-slate-200 bg-white dark:divide-slate-600 dark:bg-slate-500"
                          >
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
                                          <div class="flex flex-row">
                                            {kudo.identifier}
                                            {#if kudo.indication === true}
                                              <Tooltip
                                                text={`Payment method found`}
                                                placement="top"
                                                class="z-50 z-50 border border-slate-300 p-1.5 px-2 shadow"
                                              >
                                                <Icon
                                                  name="mini/banknotes"
                                                  class="ml-1 h-4 w-4 text-green-400"
                                                />
                                              </Tooltip>
                                            {:else if kudo.indication === false}
                                              <Tooltip
                                                text={`Payment method not found`}
                                                placement="top"
                                                class="z-50 border border-slate-300 p-1.5 px-2 shadow"
                                              >
                                                <Icon
                                                  name="mini/no-symbol"
                                                  class="ml-1 h-4 w-4 text-red-300"
                                                />
                                              </Tooltip>
                                            {:else}
                                              &nbsp;
                                            {/if}
                                          </div>
                                        </div>
                                      </EditableInput>
                                    </div></td
                                  >
                                  <td
                                    class="whitespace-nowrap py-2 pl-4 pr-3 text-xs text-slate-500 dark:text-slate-900 sm:pl-6"
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
                                    class="max-w-[200px] truncate whitespace-nowrap px-2 py-2 text-xs text-slate-500 dark:text-slate-900"
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
                                      class="text-cyan-600 hover:text-cyan-900 dark:text-cyan-900"
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
                                              'did:url:https://www.loremlabs.com',
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
                                          class="whitespace-pre-wrap bg-slate-50 p-4 text-xs dark:bg-slate-300"><JSPretty
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
                      {:else if !settle}
                        <div
                          class="m-auto flex items-center justify-center pt-8 text-2xl text-slate-500 dark:text-slate-400"
                        >
                          <div class="text-center">
                            <div
                              class="flex h-full flex-col items-center justify-center"
                            >
                              <div
                                class="m-auto flex items-center justify-center text-2xl text-slate-500 dark:text-slate-700"
                              >
                                No items
                              </div>
                            </div>

                            <div class="mt-6">
                              <button
                                type="button"
                                class="inline-flex items-center rounded-full border border-transparent bg-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none"
                                on:click={async () => {
                                  const traceId = shortId();

                                  const newKudo = {
                                    cohort,
                                    traceId,
                                    weight: 1,
                                    description: '',
                                    identifier:
                                      'did:url:https://www.loremlabs.com',
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
                                <Icon name="plus" class="-ml-1 mr-2 h-5 w-5" />
                                New Item
                              </button>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              {:else}
                <div
                  class="flex h-full flex-col items-center justify-center"
                  style={`height: 100%; max-height: ${
                    feedHeight - utilsHeight - 80
                  }px !important; min-height: ${
                    feedHeight - utilsHeight - 80
                  }px !important`}
                >
                  {#if !utilsOpen}
                    <div
                      class="m-auto flex items-center justify-center text-2xl text-slate-500 dark:text-slate-400"
                    >
                      <div class="text-center">
                        <div class="mt-6">
                          <button
                            type="button"
                            on:click={() => {
                              createNewCohort();
                            }}
                            class="inline-flex items-center rounded-full border border-transparent bg-cyan-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none"
                          >
                            <Icon name="plus" class="-ml-1 mr-2 h-5 w-5" />
                            New Segment
                          </button>
                        </div>
                      </div>
                    </div>
                  {/if}
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

<ModalStartFameDistribution
  bind:open={fameDistributionModal}
  bind:done={fameDistributionPromise}
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
</ModalStartFameDistribution>
