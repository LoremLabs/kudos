<script>
  // @ts-nocheck

  import { onMount } from 'svelte';
  import Ago from '$lib/components/Ago.svelte';
  import { colorizer } from '$lib/utils/colorizer';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import Icon from '$lib/components/Icon.svelte';

  export let ev = {};
  export let allowDetails = true;
  export let rowType = ''; // { user }

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
    class="flex h-7 w-7 items-center justify-center rounded-full"
    style={`background-color:${colorizer(ev._type)}`}
  >
    <Icon name="sparkles" class="h-4 w-4 text-white" />
  </div>
  <div class="align-end flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
    <div class="flex w-full flex-row justify-end pt-2 pb-2">
      <div class="align-start mr-12 flex flex-1 flex-col justify-start">
        <p class="text-sm text-gray-500">
          {ev._type || '?'}
        </p>
      </div>
    </div>
    <div
      class="flex flex-row items-center justify-end whitespace-nowrap text-left text-sm text-gray-500"
    >
      {#if ev._ts}
        <p class="text-[10px] text-gray-500"><Ago at={ev._ts} /></p>
      {/if}
    </div>
  </div>
</div>
{#if opened}
  <div class="ml-10"><pre class="text-xs"><JSPretty obj={ev} /></pre></div>
{/if}
