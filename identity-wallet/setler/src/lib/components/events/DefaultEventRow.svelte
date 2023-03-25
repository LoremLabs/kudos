<script>
  // @ts-nocheck

  import { onMount } from 'svelte';
  import Ago from '$lib/components/Ago.svelte';
  import { colorizer } from '$lib/utils/colorizer';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import Icon from '$lib/components/Icon.svelte';

  export let ev = {};
  export let allowDetails = true;
  export let opened = false;

  onMount(() => {});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="relative flex cursor-pointer items-center justify-center space-x-3"
  on:click={() => {
    if (allowDetails) {
      opened = !opened;
    }
  }}
>
  <div
    class="flex h-8 w-8 items-center justify-center rounded-full"
    style={`background-color:${colorizer(ev.type)}`}
  >
    <Icon name="sparkles" class="h-4 w-4 text-white" />
  </div>
  <div class="align-end flex min-w-0 flex-1 justify-start space-x-4 pt-1.5">
    <div class="flex w-full flex-row justify-start pt-2 pb-2">
      <div class="align-start mr-12 flex flex-col justify-start">
        <p class="w-12 text-xs text-gray-500">
          {ev.message || ev.type || ''}
        </p>
      </div>
      <p class="font-mono text-xs text-gray-500">
        {ev.id || '?'}
      </p>
    </div>
    <div
      class="flex flex-row items-center justify-end whitespace-nowrap text-left text-sm text-gray-500"
    >
      {#if ev.ts}
        <p class="text-[10px] text-gray-500"><Ago at={ev.ts} /></p>
      {/if}
    </div>
  </div>
</div>
{#if opened}
  <div class="ml-10"><pre class="text-xs"><JSPretty obj={ev} /></pre></div>
{/if}
