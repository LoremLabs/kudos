<script lang="ts">
  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Pane from '$lib/components/Pane.svelte';

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let onCommand = (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };
  export let onAction = (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  let actionHeight = 0;
</script>

<Pane>
  <div slot="main" class="min-h-full w-full">Settings ...</div>
  <div slot="actions">
    <div
      class="items-justify-center flex h-16 items-center justify-end border-b border-gray-200 bg-slate-50 shadow-sm"
    >
      <div
        class="mx-2 flex w-full flex-row items-center justify-start space-x-2 text-slate-900"
      >
        <ol class="flex items-center space-x-2">
          <li>
            <div>
              <span class="ml-2 text-sm font-bold text-slate-700">Settings</span
              >
            </div>
          </li>
        </ol>
      </div>
      <div class="mx-2 text-gray-500">
        {#if false}
          <button
            class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
            on:click={() => {
              dispatch('action', { action: 'settings:close' });
            }}
          >
            <Icon name="chevron-right" class="h-6 w-6" />
          </button>
        {/if}
      </div>
    </div>
  </div>
</Pane>
