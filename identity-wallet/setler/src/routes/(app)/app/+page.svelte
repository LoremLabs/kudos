<script lang="ts">
  import { shortId } from '@kudos-protocol/short-id';

  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  import { browser } from '$app/environment';

  import Tooltip from '$lib/components/Tooltip.svelte';

  // import { getConfig } from '$lib/utils/config';
  // import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { distLists } from '$lib/stores/distLists';
  import { prefs } from '$lib/stores/prefs';

  import Settings from '$lib/components/Settings.svelte';
  import IdentLedgerPane from '$lib/components/ident/IdentLedgerPane.svelte';
  import DistributionsPane from '$lib/components/distlists/DistributionsPane.svelte';
  import AssetsPane from '$lib/components/assets/AssetsPane.svelte';
  import EventsPane from '$lib/components/events/EventsPane.svelte';
  import XRPLLedgerPane from '$lib/components/ledgers/xrpl/XRPLLedgerPane.svelte';

  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Tabs, Tab, TabPanel, TabList } from '$lib/components/Tabs';
  let activeSection = 'Kudos';

  let sidebarWidth = 0;
  let sidebarHeight = 0;

  let distributionsListOpen = true;
  let activeDistList = '';
  let ready = false;

  const TABS: { id: string; icon?: IconName; twe?: string; class?: string }[] =
    [
      // { id: 'Dossier', twe: 'identification-card', class: 'twe-2x-tight' },
      // { id: 'Email', twe: 'e-mail', class:"twe-2x-tight" },
      // { id: 'Kudos', twe: 'folded-hands', class: 'twe-2x-tight' },
      // {
      //   id: 'Events',
      //   icon: 'mini/queue-list',
      //   display: 'Events',
      //   class: 'h-5 w-5',
      // },
      {
        id: 'Ident',
        icon: 'solid/identification',
        display: 'Ident',
        class: 'h-5 w-5',
      },
      {
        id: 'Assets',
        icon: 'mini/banknotes',
        display: 'Assets',
        class: 'h-5 w-5',
      },

      // {
      //   id: 'XRPL',
      //   icon: 'brand/xrpl',
      //   class: 'h-6 w-6',
      // },
      {
        id: 'Settings',
        icon: 'solid/cog-6-tooth',
        class: 'w-5 h-5',
        display: 'Settings',
      },
      {
        id: 'Distributions',
        icon: 'solid/table-cells',
        class: 'h-5 w-5',
        display: 'DistLists',
        skip: true,
      },
    ];

  let clearConfig = {};

  onMount(async () => {
    if (!browser) {
      return;
    }
    // initialize state from prefs
    const prefsState = get(prefs) || {};
    activeSection = prefsState.activeSection;
    distributionsListOpen = prefsState.distributionsListOpen;
    activeDistList = prefsState.activeDistList;

    clearConfig = await clearConfigStore.init();
    clearConfigStore.subscribe((config) => {
      clearConfig = config;
    });
    ready = true;
  });

  // when prefs change, persist
  $: {
    // console.log('prefs changed', $prefs);
    if (ready) {
      prefs.set({
        activeSection,
        distributionsListOpen,
        activeDistList,
      });
    }
  }
</script>

<svelte:window
  bind:innerHeight={sidebarHeight}
  on:resize={() => {
    // console.log('resizzed');
  }}
/>

<div class="-mt-2 min-h-screen overflow-visible">
  <Tabs bind:active={activeSection} class="">
    <main class="flex flex-row bg-slate-100">
      <TabList
        label="Account navigation"
        class="mt-2 flex flex-1 flex-col items-start gap-2 overflow-x-auto border-gray-200 bg-slate-900 p-2 md:overflow-x-visible"
        orientation="vertical"
        onTabChange={(index) => {
          if (index !== 3) {
            activeDistList = {};
          }
        }}
      >
        {#each TABS as tab, i}
          <Tab
            id={tab.id}
            class={`tooltip justified-center group flex w-36 flex-row items-end ${
              i === 0 ? 'mt-20' : ''
            }`}
            skip={tab.skip}
            let:selected
          >
            <div class="w-full">
              <Tooltip
                text={`${tab.id}`}
                delay={800}
                placement="right"
                class="z-50 z-50 border border-slate-300 p-1.5 px-4 shadow"
              >
                <button
                  id={`tab-nav-${i}`}
                  class="border-0.5 flex w-full items-center gap-3 rounded-full border-slate-100 p-2 text-xs font-medium group-hover:bg-white group-hover:text-black"
                  class:bg-slate-400={selected}
                  class:text-slate-700={selected}
                  class:text-slate-500={!selected}
                  title={tab.id}
                >
                  {#if tab.twe}
                    <i class={`twe twe-${tab.twe} ${tab.class || ''}`} />
                  {:else if tab.icon}
                    <Icon name={tab.icon} class={`${tab.class || ''}`} />
                  {/if}
                  {#if tab.display}
                    <span class="" class:font-bold={selected}
                      >{tab.display}</span
                    >
                  {/if}
                </button>
              </Tooltip>
            </div>
          </Tab>
        {/each}
        <Tooltip
          text={`Add Keys`}
          placement="right"
          delay={800}
          class="z-50 border border-slate-300 p-1.5 px-4 opacity-0 shadow"
        >
          <button
            id={`tab-add`}
            class="border-0.5 flex w-full items-center gap-3 rounded-full bg-slate-900 p-2 text-xs font-medium opacity-0 group-hover:bg-slate-50"
            title="Add"
            bind:clientWidth={sidebarWidth}
          >
            <Icon
              name="solid/plus-sm"
              class="h-7 w-7 flex-shrink-0 text-slate-500"
            />
            <span class="text-slate-500">New Split List</span>
          </button>
        </Tooltip>

        <div class="w-full text-slate-300">
          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-slate-500" />
            </div>
            <div class="relative flex justify-start">
              <button
                class="flex flex-row items-center bg-slate-900 pr-3 text-xs font-medium text-slate-500 hover:bg-slate-800"
                on:click={() => {
                  distributionsListOpen = !distributionsListOpen;
                }}
              >
                <Icon
                  name="mini/play"
                  class={`mx-1 h-2 w-2 text-slate-500 ${
                    distributionsListOpen ? 'rotate-90' : ''
                  }`}
                />
                Distributions</button
              >
            </div>
          </div>
          {#if distributionsListOpen}
            <ul
              class="mx-2 mt-4 w-32 overflow-y-scroll text-right text-xs text-slate-400"
              style={`max-height: 400px;`}
            >
              <li class="list-none truncate">
                <button
                  class="hover:underline"
                  on:click={async () => {
                    // should add a new item to the list
                    // user can click on item to edit the name
                    const newDistList = {
                      name: 'New List',
                      id: shortId(),
                      items: [],
                    };
                    if (!clearConfig.distLists) {
                      clearConfig.distLists = [];
                    }
                    // see if there is a list with the same name
                    let existingList = clearConfig.distLists.find(
                      (list) => list.name === newDistList.name
                    );
                    if (existingList) {
                      // if so, add a number to the end of the name until it is unique
                      let i = 1;
                      while (existingList) {
                        newDistList.name = `New List ${i}`;
                        existingList = clearConfig.distLists.find(
                          (list) => list.name === newDistList.name
                        );
                        i++;
                      }
                    }
                    clearConfig.distLists.push(newDistList);
                    await clearConfigStore.save(clearConfig);
                    activeSection = 'Distributions';
                    activeDistList = newDistList;
                  }}
                >
                  <div class="mt-2 flex flex-row items-center gap-1">
                    <Icon name="mini/plus" class="h-3 w-3" />
                    <span>Create List</span>
                  </div>
                </button>
              </li>

              {#each $distLists as list}
                <li class="mt-2 list-none truncate">
                  <button
                    class="hover:underline"
                    on:click={() => {
                      // should open the list
                      // user can click on item to edit the name
                      activeSection = 'Distributions';
                      activeDistList = list;
                    }}
                  >
                    <Tooltip
                      text={`${list.name}`}
                      placement="top"
                      delay={800}
                      class="z-50 z-50 border border-slate-300 p-1.5 px-4 shadow"
                    >
                      <span
                        class:font-bold={activeDistList &&
                          activeDistList.id === list.id}
                        class:text-slate-300={activeDistList &&
                          activeDistList.id === list.id}>{list.name}</span
                      >
                    </Tooltip>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </TabList>
      {#if false}
        <TabPanel class="min-h-screen w-full bg-slate-900" id="Events">
          <EventsPane
            {sidebarWidth}
            {sidebarHeight}
            active={activeSection === 'Events' ? true : false}
          />
        </TabPanel>
      {/if}
      <TabPanel class="min-h-screen w-full bg-slate-900" id="Ident">
        <IdentLedgerPane {sidebarWidth} {sidebarHeight} />
      </TabPanel>
      <TabPanel class="min-h-screen w-full bg-slate-900" id="Assets">
        <AssetsPane {sidebarWidth} {sidebarHeight} />
      </TabPanel>
      {#if false}
        <TabPanel class="min-h-screen w-full" id="XRPL">
          <XRPLLedgerPane {sidebarWidth} {sidebarHeight} />
        </TabPanel>
      {/if}
      <TabPanel class="min-h-screen w-full" id="Settings">
        <Settings />
      </TabPanel>
      <TabPanel class="min-h-screen w-full bg-slate-900" id="Distributions">
        <DistributionsPane
          {sidebarWidth}
          {sidebarHeight}
          bind:distList={activeDistList}
        />
      </TabPanel>
    </main>
  </Tabs>
</div>
