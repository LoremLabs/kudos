<script>
  import { open as openFile } from '@tauri-apps/api/dialog';
  import { open as openShell } from '@tauri-apps/api/shell';
  // import {
  //   readBinaryFile,
  //   // writeTextFile,
  //   // readDir,
  //   // Dir
  // } from '@tauri-apps/api/fs';
  import {
    //  appWindow,
    WebviewWindow,
    // LogicalSize,
    // UserAttentionType,
    // PhysicalSize,
    // PhysicalPosition
  } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';

  import Icon from '$lib/components/Icon.svelte';
  import { getConfig } from '$lib/utils/config';
  import { basename } from '$lib/utils/path';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  onMount(async () => {
    // const config = await getConfig();
    // const ws = await walletStore.init({ passPhrase: config.passPhrase });
    const clearConfig = await clearConfigStore.init();
    // clearConfig.ts = Date.now();
    // await clearConfigStore.save(clearConfig);
    // console.log({ ws, config, clearConfig });
  });

  const openDialog = async () => {
    const filePath = await openFile({
      directory: false,
      multiple: false,

      // defaultPath: defaultDir,
    });
    // console.log({ filePath });
    if (filePath) {
      // open new window
      // openShell(`setler://import/${filePath}`);
      const underPath = filePath.replace(/\//g, '_').replace(/\W/g, '_');

      const newWindowLabel = `kudos-collection-${underPath}`; // TODO
      const title = `Setler : Kudos Collection : ${basename(filePath)}`;
      const webview = new WebviewWindow(
        newWindowLabel,

        {
          url: `/collection?title=${encodeURIComponent(
            title
          )}&windowId=${encodeURIComponent(
            newWindowLabel
          )}&file=${encodeURIComponent(filePath)}`,
          // title: 'Setler',
          width: 1024,
          height: 600,
          resizable: true,
          decorations: true,
          hiddenTitle: true,
          titleBarStyle: 'overlay',

          // frameless: false,
          // transparent: false,
          // maximizable: true,
          // fullscreen: false,
          // skip_taskbar: false,
          // always_on_top: false,
          // visible: true,
          // decorations: true,
          // debug: true,
          // webviewAttributes: {
          //   nodeintegration: true,
          //   contextIsolation: false,
          //   enableRemoteModule: true,
          //   preload: 'preload.js',
          // },
        }
      );
      // windowMap[newWindowLabel] = webview
      webview.once('tauri://error', function (e) {
        console.log('Error creating new webview', e);
      });
    }
  };

  const openNewUrl = async () => {
    const newWindowLabel = `new-from-url`; // TODO
    const title = `Setler : Import Kudos from the Web`;
    const webview = new WebviewWindow(
      newWindowLabel,

      {
        url: `/new/url?title=${encodeURIComponent(
          title
        )}&windowId=${encodeURIComponent(newWindowLabel)}`,
        title,
        width: 800,
        height: 250,
        resizable: true,
        decorations: true,
        hiddenTitle: true,
        titleBarStyle: 'overlay',
      }
    );
    webview.once('tauri://error', function (e) {
      console.log('Error creating new webview', e);
    });
  };

  const goto = (url) => {
    openShell(url);
  };
</script>

<div class="mt-4 overflow-hidden">
  <div class="px-4 py-5 sm:p-6">
    <div>
      <div class="mt-1 text-sm text-gray-500">
        Add value to your <span
          class="cursor-pointer text-cyan-800 underline"
          on:click={() => {
            goto('https://www.loremlabs.com/');
          }}>kudos</span
        >. After importing, you can send money to your a collection of kudos, or
        you can recognize them publicly for their work by publishing.
      </div>
      <ul
        role="list"
        class="mt-6 grid grid-cols-1 gap-6 border-t border-b border-gray-200 py-6 sm:grid-cols-2"
      >
        <li class="flow-root">
          <div
            class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
          >
            <div
              class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-cyan-700"
            >
              <Icon name="upload" class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-900">
                <button on:click={openDialog} class="focus:outline-none">
                  <span class="absolute inset-0" aria-hidden="true" />
                  <span>Import Kudos from File</span>
                  <span aria-hidden="true"> &rarr;</span>
                </button>
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Upload a kudos that was generated from another source.
              </p>
            </div>
          </div>
        </li>

        <li class="flow-root">
          <div
            class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
          >
            <div
              class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500"
            >
              <Icon name="globe-alt" class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-900">
                <button on:click={openNewUrl} class="focus:outline-none">
                  <span class="absolute inset-0" aria-hidden="true" />
                  <span>Import Kudos from the Web</span>
                  <span aria-hidden="true"> &rarr;</span>
                </button>
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Import a collection of kudos from a url.
              </p>
            </div>
          </div>
        </li>
        {#if false}
          <li class="flow-root">
            <div
              class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
            >
              <div
                class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-green-500"
              >
                <!-- Heroicon name: outline/photo -->
                <svg
                  class="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-900">
                  <a href="#" class="focus:outline-none">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <span>Create a Gallery</span>
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                  Great for mood boards and inspiration.
                </p>
              </div>
            </div>
          </li>

          <li class="flow-root">
            <div
              class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
            >
              <div
                class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500"
              >
                <!-- Heroicon name: outline/view-columns -->
                <svg
                  class="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-900">
                  <a href="#" class="focus:outline-none">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <span>Create a Board</span>
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                  Track tasks in different stages of your project.
                </p>
              </div>
            </div>
          </li>

          <li class="flow-root">
            <div
              class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
            >
              <div
                class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500"
              >
                <!-- Heroicon name: outline/table-cells -->
                <svg
                  class="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-900">
                  <a href="#" class="focus:outline-none">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <span>Create a Spreadsheet</span>
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                  Lots of numbers and things — good for nerds.
                </p>
              </div>
            </div>
          </li>

          <li class="flow-root">
            <div
              class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500 hover:bg-gray-50"
            >
              <div
                class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500"
              >
                <!-- Heroicon name: outline/clock -->
                <svg
                  class="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-900">
                  <a href="#" class="focus:outline-none">
                    <span class="absolute inset-0" aria-hidden="true" />
                    <span>Create a Timeline</span>
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                  Get a birds-eye-view of your procrastination.
                </p>
              </div>
            </div>
          </li>
        {/if}
      </ul>
      {#if false}
        <div class="mt-4 flex">
          <button
            on:click={() => {
              goto('https://www.npmjs.com/settings/kudos-protocol/packages');
            }}
            class="text-sm font-medium text-cyan-600 hover:text-cyan-500"
          >
            Or start an new kudos collection
            <span aria-hidden="true"> &rarr;</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
