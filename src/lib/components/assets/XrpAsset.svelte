<script lang="ts">
  import { open as openShell } from '@tauri-apps/api/shell';

  import { fundViaFaucet } from '$lib/utils/wallet/xrplWallet';

  import { createEventDispatcher, onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { addToast } from '$lib/stores/toasts';

  import ModalShowQr from '$lib/components/ModalShowQr.svelte';

  export let networkName = 'xrpl:livenet';
  export let address = '';
  export let balance = {
    xrp: 0, // in drops
    usd: 0, // in cents
  };

  let networkDisplay = networkName;
  let showNetworkMenu = false;

  let showQrModal = false;

  const dispatch = createEventDispatcher();

  const goto = (url: string) => {
    openShell(url);
  };

  onMount(() => {
    if (networkName === 'xrpl:livenet') {
      networkDisplay = 'xrp';
    } else if (networkName === 'xrpl:testnet') {
      networkDisplay = 'xrp (Test)';
    } else if (networkName === 'xrpl:devnet') {
      networkDisplay = 'xrp (dev)';
    } else {
      networkDisplay = networkName;
    }
  });

  function handleOutsideClick(ev: MouseEvent) {
    // if the click comes from the opener tree we do nothing, otherwise we close the menu
    if (!showNetworkMenu) {
      return;
    }
    if (ev.target.closest('.opener')) {
      return;
    }
    showNetworkMenu = false;
    ev.preventDefault();
  }
  function handleKeypress(ev: KeyboardEvent) {
    if (showNetworkMenu && ev.key === 'Escape') {
      showNetworkMenu = false;
      ev.preventDefault;
    }
  }
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

<div class="group flex h-full flex-col items-start justify-between">
  <div class="flex w-full flex-row items-center justify-between px-2 py-2">
    <div class="flex flex-row">
      <Icon
        name="brand/xrpl"
        class="h-7 w-7 rounded-full bg-slate-800 p-1 text-white"
      />
      <button
        class="opener ml-1"
        on:click={() => {
          showNetworkMenu = !showNetworkMenu;
        }}
      >
        <Icon
          name="mini/ellipsis-vertical"
          class="mt-0.5 h-5 w-5 text-slate-500"
        />
      </button>

      <div
        class="absolute z-40 mt-2 mr-3 w-48 rounded-md bg-slate-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={`net-${networkName}-menu-button`}
        tabindex="-1"
        class:hidden={!showNetworkMenu}
        class:animate-entering={showNetworkMenu}
        class:animate-leaving={!showNetworkMenu}
      >
        <button
          class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
          id={`net-${networkName}-menu-item`}
          on:click={() => {
            navigator.clipboard.writeText(address);
            addToast({
              type: 'info',
              msg: `Copied to clipboard`,
              duration: 3000,
            });
          }}
        >
          <div class="w-6">
            <Icon name="clipboard-copy" class="mr-2 h-4 w-4" />
          </div>
          <div class="">Copy Address</div>
        </button>
        <button
          class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
          id={`net-${networkName}-menu-item`}
          on:click={() => {
            // open on ledger explorer

            if (networkName === 'xrpl:livenet') {
              goto(`https://livenet.xrpl.org/accounts/${address}`);
            } else if (networkName === 'xrpl:testnet') {
              goto(`https://testnet.xrpl.org/accounts/${address}`);
            } else if (networkName === 'xrpl:devnet') {
              goto(`https://devnet.xrpl.org/accounts/${address}`);
            } else {
              goto(`https://livenet.xrpl.org/accounts/${address}`);
            }
          }}
        >
          <div class="w-6">
            <Icon name="external-link" class="mr-2 h-4 w-4" />
          </div>
          <div class="">View Transactions</div>
        </button>
        {#if ['xrpl:devnet', 'xrpl:testnet'].includes(networkName)}
          <button
            class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
            id={`net-${networkName}-menu-item`}
            on:click={async () => {
              addToast({
                type: 'info',
                msg: `Sending funding request.`,
                duration: 3000,
              });
              const status = await fundViaFaucet(networkName);

              if (status) {
                addToast({
                  type: 'info',
                  msg: `Successfully funded via faucet`,
                  duration: 3000,
                });

                dispatch('action', {
                  action: 'update:balance',
                  params: {},
                });
              } else {
                addToast({
                  type: 'error',
                  msg: `Funding via faucet failed`,
                  duration: 3000,
                });
              }
            }}
          >
            <div class="w-6">
              <Icon name="sparkles" class="mr-2 h-4 w-4" />
            </div>
            <div class="">Fund via Faucet</div>
          </button>
        {/if}
      </div>
    </div>
    <button on:click={async () => {}}>
      <span
        class="inline-flex items-center rounded-md px-2.5 py-2 text-sm font-medium"
        class:bg-green-100={networkName === 'xrpl:livenet'}
        class:text-green-800={networkName === 'xrpl:livenet'}
        class:bg-yellow-100={networkName === 'xrpl:testnet'}
        class:text-yellow-800={networkName === 'xrpl:testnet'}
        class:bg-pink-100={networkName === 'xrpl:devnet'}
        class:text-pink-800={networkName === 'xrpl:devnet'}
      >
        <svg
          class="-ml-0.5 mr-1.5 h-2 w-2"
          class:text-green-800={networkName === 'xrpl:livenet'}
          class:text-red-800={networkName === 'xrpl:testnet'}
          class:text-pink-800={networkName === 'xrpl:devnet'}
          fill="currentColor"
          viewBox="0 0 8 8"
        >
          <circle cx="4" cy="4" r="3" />
        </svg>
        <span class="break-none text-xs uppercase">{networkDisplay}</span>
      </span>
    </button>
  </div>
  <div
    class="m-auto flex h-full w-full flex-col items-center justify-end rounded-2xl p-3"
  >
    <!-- current balance -->
    <div class="flex h-full flex-col items-center justify-center">
      <div class="text-2xl font-extrabold text-slate-900">
        {balance?.xrp ? balance?.xrp.toLocaleString() : '0'}
        <span class="uppercase text-slate-700">XRP</span>
      </div>
      <div class="font-base text-sm text-slate-500">
        $ {balance?.usd ? balance?.usd.toLocaleString() : '0'}
        <span class="uppercase text-slate-700">USD</span>
      </div>
    </div>

    <!-- send and receive buttons -->
    <div class="my-8 flex w-full flex-row items-center justify-center">
      {#if false}
        <button
          class="mr-8 flex flex-col items-center justify-center"
          on:click={() => {}}
        >
          <div
            class="m-auto flex h-10 w-10 flex-col items-center justify-center rounded-full bg-slate-300 hover:bg-slate-400"
          >
            <Icon name="arrow-sm-right" class="h-4 w-4 -rotate-90" />
          </div>
          <span class="text-sm font-medium text-slate-700">Send</span>
        </button>
      {/if}
      <button
        class="flex flex-col items-center justify-center"
        on:click={() => {
          showQrModal = !showQrModal;
        }}
      >
        <div
          class="m-auto flex h-10 w-10 flex-col items-center justify-center rounded-full bg-slate-300 hover:bg-slate-400"
        >
          <Icon name="arrow-sm-right" class="h-4 w-4 rotate-90" />
        </div>
        <span class="text-sm font-medium text-slate-700">Receive</span>
      </button>
    </div>
    <div
      class="flex flex-row items-center justify-center pb-8 text-center font-mono text-xs text-red-800"
      class:invisible={balance?.message === undefined}
      class:visible={balance?.message !== undefined}
    >
      <div class="">{balance?.message || ' '}</div>
    </div>

    <div class="invisible font-mono text-xs text-slate-500 group-hover:visible">
      {address}
    </div>
  </div>
</div>
<ModalShowQr
  bind:open={showQrModal}
  {address}
  handleConfirm={() => {
    showQrModal = false;
  }}
  handleCancel={() => {}}
>
  <div slot="header">
    <h3 class="text-lg font-black leading-6 text-gray-900" id="modal-qr">
      <span
        class="inline-flex items-center rounded-md px-2.5 py-2 text-sm font-medium"
        class:bg-green-100={networkName === 'xrpl:livenet'}
        class:text-green-800={networkName === 'xrpl:livenet'}
        class:bg-yellow-100={networkName === 'xrpl:testnet'}
        class:text-yellow-800={networkName === 'xrpl:testnet'}
        class:bg-pink-100={networkName === 'xrpl:devnet'}
        class:text-pink-800={networkName === 'xrpl:devnet'}
      >
        <svg
          class="-ml-0.5 mr-1.5 h-2 w-2"
          class:text-green-800={networkName === 'xrpl:livenet'}
          class:text-red-800={networkName === 'xrpl:testnet'}
          class:text-pink-800={networkName === 'xrpl:devnet'}
          fill="currentColor"
          viewBox="0 0 8 8"
        >
          <circle cx="4" cy="4" r="3" />
        </svg>
        <span class="break-none text-xs uppercase">{networkDisplay}</span>
      </span>
    </h3>
  </div>
</ModalShowQr>
