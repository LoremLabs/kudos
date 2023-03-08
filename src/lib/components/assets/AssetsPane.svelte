<script lang="ts">
  import { message } from '@tauri-apps/api/dialog';

  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';

  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  import { walletStore, getBalances } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  // import { activePersonaStore } from '$lib/stores/persona';
  import { writable, derived } from 'svelte/store';
  // import { asyncDerived } from '@square/svelte-store';

  import { fly } from 'svelte/transition';

  import Actions from './Actions.svelte';
  // import JsPretty from '$lib/components/JSPretty.svelte';
  import Asset from './Asset.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  let ready = false;
  let feedHeight = 0;
  let commanderHeight = 0; // disabled for here

  // mock out balances
  const balancesMock = {
    'xrpl:livenet': {
      xrp: 0,
      usd: 0,
    },
    'xrpl:testnet': {
      xrp: 0,
      usd: 0,
    },
    'xrpl:devnet': {
      xrp: 0,
      usd: 0,
    },
  };
  const balances = writable(balancesMock);

  const addresses = derived(walletStore, ($wallets) => {
    if (!$wallets) {
      return {};
    }
    if (!$wallets?.keys && !$wallets?.keys?.xrp) {
      // not ready
      return {};
    }
    //
    return {
      'xrpl:livenet': $wallets.keys.xrpl?.livenet?.address,
      'xrpl:testnet': $wallets.keys.xrpl?.testnet?.address,
      'xrpl:devnet': $wallets.keys.xrpl?.devnet?.address,
      eth: $wallets.keys.eth?.address,
      btc: $wallets.keys.btc?.address,
      kudos: $wallets.keys.kudos?.address,
    };
  });

  $: feedHeight =
    sidebarHeight -
    actionHeight -
    (utilsOpen ? utilsHeight : 0) -
    commanderHeight;

  let lastBalanceCheck = 0;

  const updateBalances = async () => {
    lastBalanceCheck = Date.now();

    const data = {};
    data['xrpl:livenet'] = await getBalances('xrpl:livenet');
    data['xrpl:testnet'] = await getBalances('xrpl:testnet');
    data['xrpl:devnet'] = await getBalances('xrpl:devnet');

    console.log('---------balances', { data });

    balances.set(data);
  };

  onMount(async () => {
    if (!browser) {
      return;
    }

    walletStore.subscribe((data) => {
      // console.log('walletStore', data);

      if (!data) {
        return;
      }

      if (!data?.keys && !data?.keys?.xrp) {
        // not ready
        return;
      }

      if (Date.now() - lastBalanceCheck < 1000) {
        return;
      }

      lastBalanceCheck = Date.now();
      updateBalances();
    });

    ready = true;
  });

  const onAction = async (e: CustomEvent) => {
    const action = e.detail?.action || '';

    switch (action) {
      case 'utils:add':
        // utilsOpen = !utilsOpen;
        break;
      case 'update:balance':
        // utilsOpen = !utilsOpen;
        await updateBalances();
        setTimeout(() => {
          refreshing = false;
        }, 750);
        break;
      default:
        console.log('unknown action', action);
    }
  };
  let actionHeight = 0;
  let utilsHeight = 0;
  let utilsOpen = false;
  let refreshing = false;
  const onCommand = () => {
    dispatch('command');
  };
</script>

{#if ready}
  <LedgerPane
    {sidebarWidth}
    on:command={onCommand}
    on:action={onAction}
    showCommander={false}
  >
    <div slot="main" class="overflow-none w-full">
      <div class="flex w-full flex-col">
        <div id="inner-action" class="mt-2" bind:clientHeight={actionHeight}>
          <Actions on:action={onAction} bind:utilsOpen bind:refreshing />
        </div>
        <div class="mr-3 bg-slate-50 dark:bg-slate-500">
          {#if utilsOpen}
            <div
              class="m-4 flex overflow-hidden rounded-2xl bg-slate-200 px-8 pb-8 pt-4 shadow"
              in:fly={{ y: -20, duration: 400 }}
              out:fly={{ y: -20, duration: 200 }}
              bind:clientHeight={utilsHeight}
            >
              open
            </div>
          {/if}
          <div
            class="h-full overflow-y-scroll pb-24"
            style={`height: 100%; max-height: ${feedHeight}px !important; min-height: ${feedHeight}px`}
          >
            <div class="m-4 grid grid-flow-row grid-cols-2 gap-4">
              {#each ['xrpl:testnet', 'xrpl:devnet', 'xrpl:livenet'] as networkName}
                {#if $clearConfigStore && $clearConfigStore.networks && $clearConfigStore.networks[networkName]}
                  <Asset
                    {networkName}
                    address={$addresses[networkName]}
                    balance={$balances[networkName]}
                    on:action={onAction}
                  />
                {/if}
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div></LedgerPane
  >
{:else}
  <Waiting />
{/if}
