<script>
  import { onMount } from 'svelte';

  import DefaultEventRow from '$lib/components/events/DefaultEventRow.svelte';
  import ChatEventRow from '$lib/components/events/ChatEventRow.svelte';
  import HelpRow from '$lib/components/events/HelpRow.svelte';

  export let ev = {};
  export let isLast = false;
  export let isFirst = false;
  export let allowDetails = false;
  export let opened = false;

  onMount(() => {});
</script>

<div class="relative ml-2">
  {#if !isLast}
    {#if isFirst}
      <span
        class="absolute top-4 left-4 -ml-px h-1/2 w-0.5 bg-transparent"
        aria-hidden="true"
      />
      <span
        class="absolute top-16 left-4 -ml-px h-full w-0.5 bg-gray-200"
        aria-hidden="true"
      />
    {:else}
      <span
        class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
        aria-hidden="true"
      />
    {/if}
  {:else}
    <span
      class="absolute top-4 left-4 -ml-px h-1/2 w-0.5 bg-gray-200"
      aria-hidden="true"
    />
  {/if}
  {#if ev?.type === 'chat'}
    <ChatEventRow {ev} {allowDetails} {opened} />
  {:else if ev?.type === 'help'}
    <HelpRow {ev} {allowDetails} {opened} />
  {:else}
    <DefaultEventRow {ev} {allowDetails} {opened} />
  {/if}
</div>
