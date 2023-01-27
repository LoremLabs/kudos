<script lang="ts">
  import { onMount } from 'svelte';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import TopNav from '$lib/components/TopNav.svelte';
  import Settings from '$lib/components/Settings.svelte';

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

<div class="overflow-visible bg-white">
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
      <TabPanel class="min-h-screen w-full bg-slate-100">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="sm:flex sm:items-center">
            <div class="sm:flex-auto">
              <h1 class="text-xl font-semibold text-gray-900">Transactions</h1>
              <p class="mt-2 text-sm text-gray-700">
                A table of placeholder stock market data that does not make any
                sense.
              </p>
            </div>
            <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                >Export</button
              >
            </div>
          </div>
          <div class="mt-8 flex flex-col">
            <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div
                class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"
              >
                <div
                  class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
                >
                  <table class="min-w-full divide-y divide-gray-300">
                    <thead class="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          class="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >Transaction ID</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Company</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Share</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Commision</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Price</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Quantity</th
                        >
                        <th
                          scope="col"
                          class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >Net amount</th
                        >
                        <th
                          scope="col"
                          class="relative whitespace-nowrap py-3.5 pl-3 pr-4 sm:pr-6"
                        >
                          <span class="sr-only">Edit</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                      <tr>
                        <td
                          class="whitespace-nowrap py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-6"
                          >AAPS0L</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm font-medium text-gray-900"
                          >Chase &amp; Co.</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm text-gray-900"
                          >CAC</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                          >+$4.37</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                          >$3,509.00</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                          >12.00</td
                        >
                        <td
                          class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                          >$4,397.00</td
                        >
                        <td
                          class="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                        >
                          <a
                            href="#"
                            class="text-indigo-600 hover:text-indigo-900"
                            >Edit<span class="sr-only">, AAPS0L</span></a
                          >
                        </td>
                      </tr>

                      <!-- More transactions... -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel class="min-h-screen w-full bg-slate-100">
        <Settings />
      </TabPanel>
    </div>
  </Tabs>
</div>
