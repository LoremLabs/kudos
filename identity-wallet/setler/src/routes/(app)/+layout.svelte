<script>
  import '$styles/inter.css';
  import '$styles/app.css';
  import '$styles/tailwind-output.css';
  import '$styles/twemoji.scss';

  import { browser } from '$app/environment';

  import { listen } from '@tauri-apps/api/event';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import TopNav from '$lib/components/TopNav.svelte';
  import Toasts from '$lib/components/Toasts.svelte';

  //  import { walletStore } from '$lib/stores/wallet';

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
  onMount(async () => {
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

    // grab the window title from the query params
    const qp = new URLSearchParams(window.location.search);
    title = qp.get('title') || 'Setler';
  });
</script>

<div
  data-tauri-drag-region
  class="absolute top-0 left-0 flex h-12 w-full cursor-default select-none justify-end overscroll-none bg-slate-900 pt-1"
>
  <TopNav />
</div>

<main
  class="z-10 mt-2 min-h-screen w-full overflow-hidden overscroll-none bg-slate-900 focus:outline-none"
>
  <slot />
</main>
<Toasts />
