<script>
  // import { Buffer } from 'buffer';
  // globalThis.Buffer = Buffer;

  import '$styles/inter.css';
  import '$styles/app.css';
  import '$styles/tailwind-output.css';
  import { browser } from '$app/environment';

  import { listen } from '@tauri-apps/api/event';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { open as openShell } from '@tauri-apps/api/shell';

  //  import { walletStore } from '$lib/stores/wallet';

  // import xrpl from 'xrpl';

  import { onMount } from 'svelte';
  import { appWindow } from '@tauri-apps/api/window';

  const disableContextMenu = () => {
    document.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );

    document.addEventListener(
      'selectstart',
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );
  };
  let title = 'Setler';
  // let xrpl;
  onMount(async () => {
    if (!browser) {
      return;
    }

    // TODO: buffer polyfill?
    // xrpl = await import('xrpl');
    // window.xrpl = xrpl;
    if (!dev) {
      disableContextMenu();
    }
    //    await walletStore.init();

    listen('show-preferences', (event) => {
      // navigate to page 2
      // https://kit.svelte.dev/docs#routing-pages
      // https://kit.svelte.dev/docs#routing-navigate
      // https://kit.svelte.dev/docs#routing-params

      goto('/preferences');
    });

    listen('goto-homepage', (event) => {
      // navigate to page 2
      // https://kit.svelte.dev/docs#routing-pages
      // https://kit.svelte.dev/docs#routing-navigate
      // https://kit.svelte.dev/docs#routing-params

      openShell(
        'https://www.loremlabs.com/?app=setler&utm_campaign=app&utm_source=setler'
      );
    });

    // grab the window title from the query params
    const qp = new URLSearchParams(window.location.search);
    title = qp.get('title') || 'Setler';
  });
</script>

<div
  data-tauri-drag-region
  class="absolute top-0 left-0 flex h-10 w-full cursor-default select-none justify-center overflow-hidden overscroll-none bg-slate-100 pt-2 italic"
>
  {title}
</div>
<main
  class="z-10 mt-8 min-h-screen w-full overflow-hidden overscroll-none bg-slate-100"
>
  <slot />
</main>
