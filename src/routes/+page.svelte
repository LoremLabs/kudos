<script>
  // import { WebviewWindow } from '@tauri-apps/api/window';
  import { open as openShell } from '@tauri-apps/api/shell';
  import { appLocalDataDir } from '@tauri-apps/api/path';

  import {
    BaseDirectory,
    createDir,
    exists,
    readTextFile,
    writeFile,
  } from '@tauri-apps/api/fs';

  import Icon from '$lib/components/Icon.svelte';
  import { onMount } from 'svelte';

  const goto = (/** @type {string} */ url) => {
    openShell(url);
  };

  let openState = 'init';

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

          <div class="h-24 w-full">
            {#if openState === 'existing'}
              <button
                type="button"
                class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >Connect Identity Wallet</button
              >
              {:else if openState === 'new'}
              <button
                type="button"
                class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >Create Identity Wallet</button
              >
              <span class="text-xs text-gray-500 m-auto inline-flex w-full items-center justify-center mt-4">
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
  <button>
    <Icon name="cog" class="mx-2 h-6 w-6" />
  </button>
</div>
