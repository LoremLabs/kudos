<script>
  import "../styles/app.css";
  import "../styles/tailwind-output.css";

  import { listen } from "@tauri-apps/api/event";
  import { goto } from "$app/navigation";

  import { onMount } from "svelte";

  onMount(() => {
    listen("show-preferences", (event) => {
      // navigate to page 2
      // https://kit.svelte.dev/docs#routing-pages
      // https://kit.svelte.dev/docs#routing-navigate
      // https://kit.svelte.dev/docs#routing-params

      goto("/preferences");
    });
  });
</script>

<main class="w-full bg-slate-100 min-h-screen p-2">
  <slot />
</main>
