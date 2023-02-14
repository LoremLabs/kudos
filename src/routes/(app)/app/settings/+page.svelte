<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import Tooltip from '$lib/components/Tooltip.svelte';
  import Settings from '$lib/components/Settings.svelte';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import Settings from '$lib/components/Settings.svelte';
  import KudosLedgerPane from '$lib/components/ledgers/kudos/KudosLedgerPane.svelte';
  import XRPLLedgerPane from '$lib/components/ledgers/xrpl/XRPLLedgerPane.svelte';

  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Tabs, Tab, TabPanel, TabList } from '$lib/components/Tabs';
  import { goto } from '$app/navigation';
  let activeSection = 'General';

  let sidebarWidth = 0;
  let sidebarHeight = 0;

  const TABS: { id: string; icon?: IconName; twe?: string; class?: string }[] =
    [
      // { id: 'Dossier', twe: 'identification-card', class: 'twe-2x-tight' },
      // { id: 'Email', twe: 'e-mail', class:"twe-2x-tight" },
      {
        id: 'General',
        icon: 'cog',
        class: 'text-gray-300 hover:text-black',
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
    const clearConfig = await clearConfigStore.init();
    // console.log({ ws, config, clearConfig });
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';

    switch (action) {
      case 'settings:close':
        goto('/app');
        break;
      default:
        console.log('unknown action', action);
    }
  };
</script>

<div
  class="-mt-2 min-h-screen overflow-visible"
  bind:clientHeight={sidebarHeight}
>
  <Tabs bind:active={activeSection} class="">
    <main class="flex flex-row bg-gray-100">
      <TabList
        label="Settings navigation"
        class="mt-2 flex flex-1 flex-col items-start gap-2 overflow-x-auto border-r border-gray-200 bg-slate-900 p-2 md:overflow-x-visible"
        orientation="vertical"
      >
        {#each TABS as tab, i}
          <Tab
            id={tab.id}
            class={`tooltip justified-center group flex flex-row items-end ${
              i === 0 ? 'mt-20' : ''
            }`}
            let:selected
          >
            <Tooltip
              text={`${tab.id}`}
              placement="right"
              class="z-50 border border-slate-300 p-1.5 px-4 shadow"
            >
              <button
                id={`tab-nav-${i}`}
                class:text-slate-900={selected}
                class:border-slate-100={!selected}
                class:border-slate-900={selected}
                class="border-0.5 flex w-full items-center gap-3 rounded-full p-2 text-xs font-medium group-hover:border-slate-900 group-hover:bg-slate-400 group-hover:text-slate-900"
                title={tab.id}
              >
                {#if tab.twe}
                  <i class={`twe twe-${tab.twe} ${tab.class || ''}`} />
                {:else if tab.icon}
                  <Icon name={tab.icon} class={`h-7 w-7 ${tab.class || ''}`} />
                {/if}
              </button>
            </Tooltip>
          </Tab>
        {/each}
        <!-- other commands here -->
      </TabList>
      <TabPanel class="min-h-screen w-full" id="General">
        <div>
          <Settings on:action={onAction} />
        </div>
      </TabPanel>
    </main>
  </Tabs>
</div>
