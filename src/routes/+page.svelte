<script>
  // import { WebviewWindow } from '@tauri-apps/api/window';
  import { open as openShell } from '@tauri-apps/api/shell';
  import { appLocalDataDir } from '@tauri-apps/api/path';
  import { invoke } from '@tauri-apps/api/tauri';
  import createOrReadSeed from '$lib/utils/createOrReadSeed';
  import Modal from '$lib/components/Modal.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { exists } from '@tauri-apps/api/fs';

  import Icon from '$lib/components/Icon.svelte';
  import { onMount } from 'svelte';

  const goto = (/** @type {string} */ url) => {
    openShell(url);
  };

  let openState = 'init';
  let modal = '';
  let mnemonic = '';
  let disabledModalSubmit = false;
  let modalOpen = false;
  let panelOpen = null;

  const onConnectWallet = async () => {
    await onCreateWallet();
  };
  const onCreateWallet = async () => {
    const salt = await invoke('get_salt');

    let id = 0;
    let passPhrase = '';
    let data = {};
    let seed;
    try {
      seed = await createOrReadSeed({ salt, id, passPhrase });
      // console.log({ seed });
      data.mnemonic = seed.mnemonic;
      mnemonic = seed.mnemonic;
      data.xrpl = seed.xrpl;
    } catch (e) {
      console.log({ e });
      alert(e.message);
    }
    //alert(JSON.stringify(data));
    modal = 'seed';
    modalOpen = true;
    disabledModalSubmit = true;

    setTimeout(() => {
      disabledModalSubmit = false;
    }, 2000);
  };

  onMount(async () => {
    const checkForSeedFile = async () => {
      const baseDir = await appLocalDataDir();
      const fullPath = `${baseDir}state/setlr-0.seed`;

      try {
        const fileFound = await exists(fullPath);
        console.log({ fileFound });
        if (fileFound) {
          return 'existing';
        } else {
          return 'new';
        }
      } catch (e) {
        console.log('error opening seed', e);
        return 'error';
      }
    };
    openState = await checkForSeedFile();
  });
</script>

<div class="overflow-hidden bg-white">
  <section aria-labelledby="features-heading" class="relative min-h-screen">
    <div
      class="aspect-w-3 aspect-h-2 md:aspect-none hidden overflow-hidden pt-2 md:absolute md:block md:h-full md:w-2/5 md:pr-4 xl:pr-16"
    >
      <img
        src="/joao-guimaraes-9b4jtcBEP4A-unsplash.jpg"
        alt=""
        class="borderz h-full w-full border-r-4 border-r-gray-200 object-cover object-center md:h-full md:w-full"
      />
    </div>
    <div class="absolute bottom-10 left-5 hidden opacity-50 md:block">
      <button
        on:click={() => {
          goto(
            'https://unsplash.com/photos/9b4jtcBEP4A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText'
          );
        }}
      >
        <span
          class="inline-flex items-center rounded-full bg-gray-100 py-0.5 pl-2 pr-0.5 text-xs font-medium text-gray-700"
        >
          <!-- TODO: make this kudos work! -->
          kudos: João Guimarães
          <Icon name="external-link" class="mx-2 h-3 w-3" />
        </span>
      </button>
    </div>

    <div
      class="white mx-auto max-w-2xl px-4 sm:px-6 md:grid md:max-w-7xl md:grid-cols-5 md:gap-x-8 md:px-4 md:pt-12"
    >
      <div class="mt-4 pl-8 pr-12 md:col-span-3 md:col-start-3">
        <h2 id="features-heading" class="font-thin text-gray-500">
          Setler: an <span class="font-medium italic">identity wallet</span> for
          your digital life
        </h2>
        <p class="mt-4 text-4xl font-bold tracking-tight text-gray-900">
          Welcome!
        </p>
        <p class="mt-4 text-gray-700">
          Setler helps you manage your decentralized, self-sovereign identity
          with a suite of communications, payment, and authoring tools powered
          by cryptography.
        </p>

        <dl
          class="mt-10 grid grid-cols-1 gap-y-10 gap-x-8 text-sm sm:grid-cols-1"
        >
          <div>
            <dt class="font-medium text-gray-900">
              Distributed Identifier Registry
            </dt>
            <dd class="mt-2 text-gray-700">
              Use your identity wallet to store Distributed Identifiers (DIDs)
              which enable no one but you to control your identity data.
            </dd>
          </div>

          <div>
            <dt class="font-medium text-gray-900">Kudos Settlement</dt>
            <dd class="mt-2 text-gray-700">
              Manage your digital reputation by sending and settling <button
                class="underline"
                on:click={() => {
                  goto('https://www.loremlabs.com/?utm_campaign=setler');
                }}>kudos</button
              >.
            </dd>
          </div>

          <div>
            <dt class="font-medium text-gray-900">Non-custodial Wallet</dt>
            <dd class="mt-2 text-gray-700">
              Your cryptographic keys enable you to interface with the
              blockchain.
            </dd>
          </div>

          <div class="-mt-4 h-24 w-full">
            {#if openState === 'existing'}
              <button
                type="button"
                on:click={onConnectWallet}
                class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >Connect Identity Wallet</button
              >
            {:else if openState === 'new'}
              <button
                type="button"
                on:click={onCreateWallet}
                class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >Create Identity Wallet</button
              >
              <span
                class="m-auto mt-4 inline-flex w-full items-center justify-center text-xs text-gray-500"
              >
                This creates your keys and stores in your computer's key chain.
              </span>
            {/if}
          </div>
        </dl>
      </div>
    </div>
  </section>
</div>
<div class="absolute top-20 right-8 text-gray-500">
  <button
  id="panel-open"
  class="focus:outline-none"
  on:click={() => {
    panelOpen = document.getElementById('panel-open');
  }}>
    <Icon name="cog" class="mx-2 h-6 w-6" />
  </button>
</div>
<Panel
heading="Settings"

  bind:opener={panelOpen}>

  <div slot="footer">
  <button
  on:click={() => (panelOpen = null)}
  type="button"
  class="py-2 px-4 border border-gray-300 shadow-sm rounded-full
  text-sm font-medium bg-blue-700 text-white
  hover:bg-gray-700 cursor-pointer transition delay-150 ease-in-out
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
>
  Save
</button>

</div>


</Panel>
{#if modal === 'seed'}
  <Modal
    bind:open={modalOpen}
    ariaLabelledBy="modal"
    class="top-8 bg-gray-50 pl-4 pt-5 pb-4 pr-8 shadow-xl sm:p-6"
  >
    <div class="bg-white sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <p class="mt-4 text-4xl font-bold tracking-tight text-gray-900">
          Important!
        </p>
        <h3 class="my-8 text-lg font-medium leading-6 text-gray-900">
          These words are called your recovery phrase. Please write them down on
          paper in the order shown and store them in a safe place. We recommend
          against using an online or cloud-based service to store your recovery
          phrase.
        </h3>
        <div class="m-auto mt-2 max-w-xl text-sm text-gray-500">
          <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <!-- Heroicon name: mini/x-circle -->
                <svg
                  class="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  If you lose your recovery phrase, you will lose access to your
                  wallet which contains your identity and may result in
                  financial loss.
                </h3>
                <div class="mt-2 text-sm text-red-700">
                  <ul role="list" class="list-disc space-y-1 pl-5">
                    <li>It's recommended to use paper.</li>
                    <li>Order matters.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <dl class="mt-10 grid grid-cols-6 gap-y-10 gap-x-8 text-sm">
          {#each mnemonic.split(' ') as word, i}
            <dd class="inline-flex items-center ">
              <span>
                {i + 1}
              </span>
              <div
                class="m-auto justify-center rounded-full bg-gray-100 px-2 font-mono text-black"
              >
                {word}
              </div>
            </dd>
          {/each}
        </dl>
        <div class="mt-12">
          <button
            on:click={() => {
              modal = '';
              modalOpen = false;
              window.location.href = '/kudos';
            }}
            type="button"
            disabled={disabledModalSubmit}
            class="inline-flex items-center rounded-full border border-white bg-red-800 px-4 py-2 font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-0 focus:ring-offset-2 disabled:bg-red-200 sm:text-sm"
            >I have written these down</button
          >
        </div>
      </div>
    </div>
  </Modal>
{/if}
