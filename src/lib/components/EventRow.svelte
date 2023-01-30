<script>
  import { onMount } from 'svelte';

  import DefaultEventRow from '$lib/components/events/DefaultEventRow.svelte';

  export let ev = {};
  export let isLast = false;
  export let allowDetails = false;
  export let opened = false;

  onMount(() => {});
</script>

<div class="relative ml-2">
  {#if !isLast}
    <span
      class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
      aria-hidden="true"
    />
  {/if}
  <!-- TODO, other event types -->
  <DefaultEventRow {ev} {allowDetails} {opened} />
</div>
