<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  //   import { goto } from '$app/navigation';

  import { shortId } from '@kudos-protocol/short-id';
  import { fly } from 'svelte/transition';

  import { setConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { eventsStore } from '$lib/stores/events';

  import Icon from '$lib/components/Icon.svelte';
  import Waiting from '$lib/components/Waiting.svelte';

  import { noop } from '$lib/utils/noop';

  import { WebviewWindow } from '@tauri-apps/api/window';
  import { appWindow } from '@tauri-apps/api/window';
  import { goto } from '$app/navigation';

  let ready = 0;
  let confirmed = false;
  let showBox = false;

  const onCancel = () => {
    goto('/app');
  };

  const onReset = async () => {
    if (!browser) {
      return;
    }

    // await noop();
    // await walletStore.reset({});
    await noop();
    await clearConfigStore.reset();
    await noop();
    await eventsStore.reset();
    await noop();
    await setConfig({});

    confirmed = true;
  };

  const onLock = async () => {
    if (!browser) {
      return;
    }

    // await noop();
    // await walletStore.reset({});
    // await noop();
    // await clearConfigStore.reset();
    // await noop();
    // await eventsStore.reset();
    // await noop();
    // await setConfig({});

    confirmed = true;
    await noop();
    await openLoginWindow();
  };

  const openLoginWindow = async () => {
    const openMainWindow = async () => {
      const webview = new WebviewWindow(`login-${shortId()}`, {
        url: '/',

        // window features
        title: 'Setler',
        resizable: true,
        width: 769,
        height: 769,
        decorations: true,
        hiddenTitle: true,
        titleBarStyle: 'Overlay',
        center: true,
        acceptFirstMouse: true,
        userAgent: 'setler/desktop',
      });
      webview.once('tauri://created', async () => {
        // webview window successfully created
        await appWindow.close();
      });
    };
    openMainWindow();
  };

  onMount(async () => {
    if (!browser) {
      return;
    }

    // await walletStore.reset({});
    // await clearConfigStore.reset();
    // await eventsStore.reset();
    // await setConfig({});

    setTimeout(() => {
      ready = 1; // no idea why, but this is needed to trigger ready
    }, 1);

    // setTimeout(() =>{
    showBox = true;
    // }, 500);
  });
</script>

{#if !confirmed}
  <div class="h-screen h-full w-full">
    <div
      class="items-justify-center m-auto flex h-full flex-col items-center justify-center text-white"
    >
      <div
        class="relative z-10"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity ease-in ease-out"
        />

        <div class="fixed inset-0 z-10 overflow-y-auto">
          <div
            class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
          >
            <div
              class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
              in:fly={{ y: -20, duration: 800 }}
              out:fly={{ y: -20, duration: 200 }}
            >
              <div class="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-transparent focus:ring-offset-2"
                  on:click={onCancel}
                >
                  <span class="sr-only">Close</span>
                  <Icon name="solid/x" class="h-6 w-6" />
                </button>
              </div>
              <div class="sm:flex sm:items-start">
                <div
                  class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
                >
                  <Icon
                    name="exclamation-triangle"
                    class="h-6 w-6 text-red-600"
                  />
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    class="text-lg font-medium leading-6 text-gray-900"
                    id="modal-title"
                  >
                    Logout
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      Are you sure you want to logout?
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  on:click={onLock}>Logout</button
                >
                <button
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  on:click={onCancel}>Cancel</button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="h-screen h-full w-full">
    <Waiting grace={false}>
      <div class="mt-12 bg-transparent text-4xl text-slate-900 opacity-25">
        Logging off...
      </div>
    </Waiting>
  </div>
{/if}
