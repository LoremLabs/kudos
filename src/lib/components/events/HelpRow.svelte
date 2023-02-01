<script>
  // @ts-nocheck

  import { onMount } from 'svelte';
  import Ago from '$lib/components/Ago.svelte';
  import { colorizer } from '$lib/utils/colorizer';
  import JSPretty from '$lib/components/JSPretty.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Identicon from '$lib/components/Identicon.svelte';

  import { renderMessage } from '$lib/utils/render-message';

  export let ev = {};
  export let allowDetails = true;
  export let rowType = ''; // { user }

  export let opened = false;

  onMount(() => {});
</script>

<span
  class="absolute top-4 left-4 -ml-px h-1/2 w-0.5 bg-gray-200"
  aria-hidden="true"
/>

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
    style={`background-color:${colorizer(ev.type)}`}
  >
    <Icon name="chat-alt" class="h-4 w-4 text-white" />
  </div>

  <div class="flex-1 overflow-y-auto py-4 pl-1">
    <!-- chat message -->

    <div class="-ml-4 flex items-center">
      {#if ev.from}
        <div
          class="mr-2 flex h-8 w-8 flex-none flex-col items-center justify-center space-y-1 rounded-full"
        >
          <Identicon class="mt-4 ml-4" diameter={20} address={ev.from} />
        </div>
      {/if}
      <div
        class="relative mb-2 ml-4 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-white shadow"
      >
        <div>
          <div class="align-start flex flex-col items-start justify-start p-2">
            <p class="w-full text-xs text-black">
              {@html renderMessage(ev.message || ev.type || '')}
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
