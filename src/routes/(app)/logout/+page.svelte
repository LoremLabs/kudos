<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  //   import { goto } from '$app/navigation';

  import { shortId } from '$lib/utils/short-id';

  import { setConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { eventsStore } from '$lib/stores/events';

  import Waiting from '$lib/components/Waiting.svelte';

  import { WebviewWindow } from '@tauri-apps/api/window';
  import { appWindow } from '@tauri-apps/api/window';

  let ready: boolean = false;

  onMount(async () => {
    if (!browser) {
      return;
    }

    // TODO: how to logout "properly?" close stores / connections?
    // const config = await getConfig(true); // using cached config
    await walletStore.reset({});
    await clearConfigStore.reset();
    await eventsStore.reset();
    await setConfig({});

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

    ready = true;
  });
</script>

<div class="h-screen h-full w-full">
  {#if !ready}
    <!-- TODO: this isn't working with ready?! -->
    <Waiting grace={false}>
      <div class="mt-12 bg-transparent text-4xl text-slate-900 opacity-25">
        Logging off...
      </div>
    </Waiting>
  {:else}
    <div
      class="items-justify-center m-auto flex h-full flex-col items-center justify-center text-white"
    >
      Logging off...
    </div>
  {/if}
</div>
