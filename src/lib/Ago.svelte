<script>
  import { format } from 'timeago.js';

  import { onMount } from 'svelte';
  export let at = new Date() + '';
  let loaded = false;
  onMount(() => {
    loaded = true;
  });
</script>

{#if loaded}
  <time datetime={at} title={at}>{format(new Date(at))}</time>
{:else}
  -
{/if}
