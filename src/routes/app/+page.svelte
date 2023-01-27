<script lang="ts">
  import { onMount } from 'svelte';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import TopNav from '$lib/components/TopNav.svelte';
  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Tabs, Tab, TabPanel, TabList } from '$lib/components/Tabs';
  let activeSection = 'Members';

  const TABS: { id: string; icon: IconName }[] = [
    { id: 'Dossier', icon: 'badge-check' },
    { id: 'Channels', icon: 'at-symbol' },
    { id: 'Settings', icon: 'cog' },
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

    const config = await getConfig();
    const ws = await walletStore.init({ passPhrase: config.passPhrase });
    const clearConfig = await clearConfigStore.init();
    console.log({ ws, config, clearConfig });
  });
</script>

<div class="mt-4 overflow-visible bg-white">
  <TopNav />

  <Tabs bind:active={activeSection} class="">
    <nav class="">
      <TabList
        label="Account navigation"
        class="flex flex-1 flex-row items-center gap-2 overflow-x-auto border-b border-gray-200 p-2 md:overflow-x-visible"
        orientation="horizontal"
      >
        {#each TABS as tab}
          <Tab id={tab.id} class="-mb-2" let:selected>
            <button
              class="group flex w-full items-center gap-3 rounded-sm p-2 text-xs font-medium text-gray-600 hover:border-b-2 hover:text-gray-900"
              class:border-slate-500={selected}
              class:border-b-2={selected}
            >
              <Icon
                name={tab.icon}
                class="h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
              />
              <span>{tab.id}</span>
            </button>
          </Tab>
        {/each}
      </TabList>
    </nav>
    <div class="min-h-screen w-full">
      <TabPanel class="min-h-screen w-full bg-slate-100">hi</TabPanel>
      <TabPanel class="min-h-screen w-full bg-slate-100">hi 2</TabPanel>
      <TabPanel class="min-h-screen w-full bg-slate-100">hi3</TabPanel>
    </div>
  </Tabs>
</div>
