<script>
  import { format } from 'timeago.js';

  import { onMount, onDestroy } from 'svelte';
  export let at = new Date() + '';
  let loaded = false;
  let formatted = '';
  let updater;
  onMount(() => {
    loaded = true;
    formatted = format(new Date(at));

    // update every 20 seconds
    updater = setInterval(() => {
      formatted = format(new Date(at));
    }, 20000);
  });

  // on destroy, clear the interval
  onDestroy(() => {
    clearInterval(updater);
  });
</script>

{#if loaded}
  <time datetime={at} title={at}>{formatted}</time>
{:else}
  -
{/if}
