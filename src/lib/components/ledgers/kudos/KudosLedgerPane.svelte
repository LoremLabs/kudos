<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import LedgerPane from '$lib/components/LedgerPane.svelte';
  import Actions from './Actions.svelte';
  import Feed from './Feed.svelte';

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  let feedHeight = 0;
  let totalHeight = 0;
  let actionHeight = 0;
  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  $: feedHeight = sidebarHeight - actionHeight - 100;
</script>

<LedgerPane {sidebarWidth} on:command={onCommand} on:action={onAction}>
  <div slot="main" class="w-full overflow-y-scroll">
    <div class="flex w-full flex-col">
      <div bind:clientHeight={actionHeight}>
        <Actions />
      </div>
      <Feed {feedHeight} />
    </div>
  </div>
</LedgerPane>
