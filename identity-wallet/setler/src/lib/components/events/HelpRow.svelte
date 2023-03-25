<script>
  // @ts-nocheck

  import { onMount } from 'svelte';
  import Ago from '$lib/components/Ago.svelte';
  import { colorizer } from '$lib/utils/colorizer';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import KeyIcon from '$lib/components/KeyIcon.svelte';

  import { renderMessage } from '$lib/utils/render-message';

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
    <Icon name="chevron-right" class="h-4 w-4 text-white" />
  </div>

  <div class="flex-1 overflow-y-auto pb-4 pl-1">
    <div class="-ml-4 flex items-center pt-6">
      <div
        class="relative mb-2 ml-4 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-white shadow"
      >
        <div>
          <div class="align-start flex flex-col items-start justify-start p-2">
            <p class="w-full text-xs text-black">
              {@html renderMessage(ev.body?.message || ev.type || '')}
            </p>
          </div>
        </div>

        <!-- arrow -->
        <div
          class="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 rotate-45 transform border-b border-l border-slate-200 bg-white"
        />
        <!-- end arrow -->
      </div>
    </div>
    <div
      class="flex flex-row items-start justify-end whitespace-nowrap text-right text-sm text-gray-500"
    >
      {#if ev.ts}
        <p class="ml-6 text-[10px] text-gray-500"><Ago at={ev.ts} /></p>
      {/if}
    </div>
  </div>
</div>

{#if opened}
  <div class="ml-10"><pre class="text-xs"><JSPretty obj={ev} /></pre></div>
{/if}
