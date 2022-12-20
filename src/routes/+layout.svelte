<script>
  import "../styles/app.css";
  import "../styles/tailwind-output.css";

  import { listen } from "@tauri-apps/api/event";
  import { goto } from "$app/navigation";
  import { dev } from "$app/environment";

  import { onMount } from "svelte";
  import { appWindow } from "@tauri-apps/api/window";

  const disableContextMenu = () => {
    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );

    document.addEventListener(
      "selectstart",
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );
  };

  onMount(() => {
    if (!dev) {
      disableContextMenu();
    }

    listen("show-preferences", (event) => {
      // navigate to page 2
      // https://kit.svelte.dev/docs#routing-pages
      // https://kit.svelte.dev/docs#routing-navigate
      // https://kit.svelte.dev/docs#routing-params

      goto("/preferences");
    });
  });
</script>


<div data-tauri-drag-region class="fixed top-0 left-0 justify-center flex bg-slate-100 h-10 w-full pt-2 italic select-none cursor-default">
Setler
</div>        

<main class="w-full bg-slate-100 min-h-screen p-2 mt-8">
  <slot />
</main>
