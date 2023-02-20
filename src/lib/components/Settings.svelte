<script lang="ts">
  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Pane from '$lib/components/Pane.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import Form from '$lib/components/Form.svelte';
  import SettingsWell from '$lib/components/SettingsWell.svelte';

  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { walletStore } from '$lib/stores/wallet.js';

  import { Tab, TabList, TabPanel, Tabs } from '$lib/components/Tabs';

  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';

  let activeSection = 'General';

  const TABS: { id: string; icon?: IconName; twe?: string; class?: string }[] =
    [
      // { id: 'Dossier', twe: 'identification-card', class: 'twe-2x-tight' },
      // { id: 'Email', twe: 'e-mail', class:"twe-2x-tight" },
      {
        id: 'General',
        name: 'General',
        class: 'text-slate-900 hover:text-black',
      },
      {
        id: 'Crypto',
        name: 'Crypto',
        class: 'text-slate-900 hover:text-black',
      },
      {
        id: 'Identity',
        name: 'Identity',
        class: 'text-slate-900 hover:text-black',
      },
    ];

  const dispatch = createEventDispatcher();

  let forms = {
    General: {
      id: 'mnemonic',
      inputs: [
        {
          name: 'mnemonic',
          type: 'disclose-copy',
          displayName: 'Your Mnemonic Phrase',
          disabled: true,
          value: $walletStore?.mnemonic || '',
        },
      ],
    },
  };

  export let sidebarWidth = 0;
  export let onCommand = (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };
  export let onAction = (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  let actionHeight = 0;
  let formData = {
    General: {
      customMnemonic: '',
    },
  };
  let clearConfig = {};

  const DEFAULT_NETWORKS = {
    // mainnet with no prefix
    bitcoin: false,
    ethereum: false,
    xrp: true,

    'test:xrp': true,
    'dev:xrp': true,
  };

  const toggleActiveNetwork = async (networkId) => {
    if (!clearConfig.networks) {
      clearConfig.networks = DEFAULT_NETWORKS;
    }
    clearConfig.networks[networkId] = !clearConfig.networks[networkId];
    await clearConfigStore.save(clearConfig);
  };

  onMount(async () => {
    clearConfig = await clearConfigStore.init();
    clearConfigStore.subscribe((config) => {
      clearConfig = config;
    });
  });
</script>

<Pane bind:active={activeSection}>
  <div slot="main" class="min-h-full w-full">
    <TabPanel class="min-h-screen w-full" id="General">
      <SettingsWell>
        <div slot="header">
          <h2 class="text-sm font-medium uppercase leading-6 text-slate-900">
            General
          </h2>
        </div>
        <div slot="main">
          <Form form={forms.General} bind:formData={formData.General}>
            <div slot="disclose-copy">
              <div class="m-auto mt-2 max-w-xl text-sm text-gray-500">
                <div class="rounded-md bg-red-50 p-4">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <Icon name="mini/x-circle" class="h-5 w-5 text-red-400" />
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800">
                        If you lose your mnemonic recovery phrase, you will lose
                        access to your wallet which contains your identity and
                        may result in financial loss.
                      </h3>
                      <div class="mt-2 text-sm text-red-700">
                        <ul role="list" class="list-disc space-y-1 pl-5">
                          <li>It's recommended to use paper.</li>
                          <li>Order matters.</li>
                          <li>
                            If you use a phase phrase you should remember it
                            too.
                          </li>
                          <li>
                            Don't share this with anyone, including "support".
                          </li>
                          <li>Make sure no one is looking when you reveal.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </SettingsWell>
    </TabPanel>
    <TabPanel class="min-h-screen w-full" id="Crypto">
      <SettingsWell>
        <div slot="header">
          <h2 class="text-sm font-medium uppercase leading-6 text-slate-900">
            Crypto
          </h2>
        </div>
        <div slot="main">
          <!-- foreach xrp, bitcoin, ethereum -->

          {#each ['xrp', 'ethereum', 'bitcoin'] as networkName}
            {#if $clearConfigStore && $clearConfigStore.networks}
              <button
                on:click={async () => {
                  toggleActiveNetwork(networkName);
                }}
              >
                <span
                  class="mx-2 inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium"
                  class:bg-green-100={$clearConfigStore.networks[networkName]}
                  class:text-green-800={$clearConfigStore.networks[networkName]}
                  class:bg-slate-100={!$clearConfigStore.networks[networkName]}
                  class:text-slate-800={!$clearConfigStore.networks[
                    networkName
                  ]}
                >
                  <svg
                    class="-ml-0.5 mr-1.5 h-2 w-2"
                    class:text-green-400={$clearConfigStore.networks[
                      networkName
                    ]}
                    class:text-slate-400={!$clearConfigStore.networks[
                      networkName
                    ]}
                    fill="currentColor"
                    viewBox="0 0 8 8"
                  >
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  <span class="text-xs uppercase">{networkName}</span>
                </span>
              </button>
            {/if}
          {/each}
        </div>
      </SettingsWell>
      <SettingsWell>
        <div slot="header">
          <h2 class="text-sm font-medium uppercase leading-6 text-slate-900">
            Crypto: Test and Developer Networks
          </h2>
        </div>
        <div slot="main">
          {#each ['test:xrp', 'dev:xrp'] as networkName}
            {#if $clearConfigStore && $clearConfigStore.networks}
              <button
                on:click={async () => {
                  toggleActiveNetwork(networkName);
                }}
              >
                <span
                  class="mx-2 inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium"
                  class:bg-pink-100={$clearConfigStore.networks[networkName]}
                  class:text-gping-800={$clearConfigStore.networks[networkName]}
                  class:bg-slate-100={!$clearConfigStore.networks[networkName]}
                  class:text-slate-800={!$clearConfigStore.networks[
                    networkName
                  ]}
                >
                  <svg
                    class="-ml-0.5 mr-1.5 h-2 w-2"
                    class:text-pink-400={$clearConfigStore.networks[
                      networkName
                    ]}
                    class:text-slate-400={!$clearConfigStore.networks[
                      networkName
                    ]}
                    fill="currentColor"
                    viewBox="0 0 8 8"
                  >
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  <span class="text-xs uppercase">{networkName}</span>
                </span>
              </button>
            {/if}
          {/each}
        </div>
      </SettingsWell>
    </TabPanel>
    <TabPanel class="min-h-screen w-full" id="Identity">
      <div>ident</div>
    </TabPanel>
  </div>
  <div slot="actions">
    <div
      class="mr-3 rounded-t-2xl border-2 border-b-0 border-l-0 border-r-0 border-slate-50 bg-slate-50 dark:border-slate-400 dark:bg-slate-400"
    >
      <div
        class="items-justify-center flex h-16 flex-row items-center justify-end border-b border-gray-200 shadow-sm dark:border-slate-600"
      >
        <div
          class="mx-2 flex w-full flex-row items-center justify-start space-x-2 text-slate-900"
        >
          <div class="flex w-full flex-row items-center justify-start">
            <ol class="flex w-full items-center space-x-2">
              <li>
                <div class="">
                  <span class="ml-2 text-sm font-bold text-slate-700"
                    >Settings</span
                  >
                </div>
              </li>
            </ol>
            <div class="group flex w-full items-center justify-end">
              <TabList
                label="Settings navigation"
                class="mt-2 flex flex-1 flex-row items-start justify-end gap-2 overflow-x-auto bg-slate-50 p-2 md:overflow-x-visible"
                orientation="horizontal"
              >
                {#each TABS as tab, i}
                  <Tab
                    id={tab.id}
                    class={`justified-center group flex flex-row items-end text-slate-500`}
                    let:selected
                  >
                    <button
                      id={`tab-nav-${i}`}
                      class:text-slate-600={selected}
                      class:font-bold={selected}
                      class:font-medium={!selected}
                      class:border-b-2={selected}
                      class:border-slate-400={!selected}
                      class:border-slate-900={selected}
                      class="group-hover:border-b-3 -mb-5 flex w-full items-center gap-3 p-2 text-sm group-hover:border-slate-500 group-hover:text-slate-900"
                      title={tab.id}
                    >
                      {#if tab.twe}
                        <i class={`twe twe-${tab.twe} ${tab.class || ''}`} />
                      {:else if tab.icon}
                        <Icon
                          name={tab.icon}
                          class={`h-7 w-7 ${tab.class || ''}`}
                        />
                      {:else if tab.name}
                        <span class="text-sm font-bold">{tab.name}</span>
                      {/if}
                    </button>
                  </Tab>
                {/each}
              </TabList>

              {#if false}
                <button
                  class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
                  on:click={() => {
                    dispatch('action', { action: 'settings:close' });
                  }}
                >
                  <Icon name="eye" class="h-6 w-6" />
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Pane>
