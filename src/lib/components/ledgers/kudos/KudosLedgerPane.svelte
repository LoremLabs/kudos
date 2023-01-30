<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  import LedgerPane from '$lib/components/LedgerPane.svelte';

  import Actions from './Actions.svelte';
  import Feed from './Feed.svelte';

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  let feedHeight = 0;
  let actionHeight = 0;

  // onMount(() => {
  //   setTimeout(() => {
  //     // This is annoying because there's a bug in svelte's bind:clientHeight that sets a position = relative
  //     // which causes the tooltips to shop up behind this element. So we have to wait for the element to be
  //     // rendered and then set the height "manually".
  //     const action = document.getElementById('inner-action');
  //     if (action) {
  //       actionHeight = action.clientHeight;
  //     }
  //   }, 10);
  // });

  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  // on window resize, recalculate the height of actions (due to svelte bug, to get the tooltips and command to work)
  // window.addEventListener('resize', () => {
  //   const action = document.getElementById('inner-action');
  //   if (action) {
  //     actionHeight = action.clientHeight;
  //   }
  // });

  $: feedHeight = sidebarHeight - actionHeight - 100;
</script>

<LedgerPane {sidebarWidth} on:command={onCommand} on:action={onAction}>
  <div slot="main" class="w-full overflow-y-scroll">
    <div class="flex w-full flex-col">
      <div id="inner-action" bind:clientHeight={actionHeight}>
        <Actions />
      </div>
      <Feed {feedHeight} />
    </div>
  </div>
</LedgerPane>
