<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import Tooltip from '$lib/components/Tooltip.svelte';

  // import { getConfig } from '$lib/utils/config';
  // import { walletStore } from '$lib/stores/wallet';
  // import { clearConfigStore } from '$lib/stores/clearConfig';

  import Settings from '$lib/components/Settings.svelte';
  import KudosLedgerPane from '$lib/components/ledgers/kudos/KudosLedgerPane.svelte';
  import XRPLLedgerPane from '$lib/components/ledgers/xrpl/XRPLLedgerPane.svelte';

  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Tabs, Tab, TabPanel, TabList } from '$lib/components/Tabs';
  let activeSection = 'Kudos';

  let sidebarWidth = 0;
  let sidebarHeight = 0;

  const TABS: { id: string; icon?: IconName; twe?: string; class?: string }[] =
    [
      // { id: 'Dossier', twe: 'identification-card', class: 'twe-2x-tight' },
      // { id: 'Email', twe: 'e-mail', class:"twe-2x-tight" },
      // { id: 'Kudos', twe: 'folded-hands', class: 'twe-2x-tight' },
      {
        id: 'Kudos',
        icon: 'mini/queue-list',
        display: 'Kudos',
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
        class: 'w-6 h-6',
        display: 'Settings',
      },
    ];

  onMount(async () => {
    if (!browser) {
      return;
    }
    //   if (location.hash.startsWith('#community-')) {
    //     const selected = location.hash.split('-')[1];
    //     if (TABS.find((tab) => tab.id === selected)) {
    //       activeSection = selected;
    //     }
    //   }

    // const config = await getConfig();
    // const ws = await walletStore.init({ passPhrase: config.passPhrase });
    // const clearConfig = await clearConfigStore.init();
    // console.log({ ws, config, clearConfig });
  });
</script>

<div
  class="-mt-2 min-h-screen overflow-visible"
  bind:clientHeight={sidebarHeight}
>
  <Tabs bind:active={activeSection} class="">
    <main class="flex flex-row bg-slate-100">
      <TabList
        label="Account navigation"
        class="mt-2 flex flex-1 flex-col items-start gap-2 overflow-x-auto border-gray-200 bg-slate-900 p-2 md:overflow-x-visible"
        orientation="vertical"
      >
        {#each TABS as tab, i}
          <Tab
            id={tab.id}
            class={`tooltip justified-center group flex w-36 flex-row items-end ${
              i === 0 ? 'mt-20' : ''
            }`}
            let:selected
          >
            <div class="w-full">
              <Tooltip
                text={`${tab.id}`}
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
              class="h-7 w-7 flex-shrink-0 text-gray-400"
            />
          </button>
        </Tooltip>
      </TabList>
      <TabPanel class="min-h-screen w-full bg-slate-900" id="Kudos">
        <KudosLedgerPane {sidebarWidth} {sidebarHeight} />
      </TabPanel>
      {#if false}
        <TabPanel class="min-h-screen w-full" id="XRPL">
          <XRPLLedgerPane {sidebarWidth} {sidebarHeight} />
        </TabPanel>
      {/if}
      <TabPanel class="min-h-screen w-full" id="Settings">
        <Settings />
      </TabPanel>
    </main>
  </Tabs>
</div>
