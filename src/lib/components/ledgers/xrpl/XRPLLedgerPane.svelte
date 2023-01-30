<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import LedgerPane from '$lib/components/LedgerPane.svelte';

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;

  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  $: paneHeight = sidebarHeight - 100;
</script>

<LedgerPane
  {sidebarWidth}
  {sidebarHeight}
  on:command={onCommand}
  on:action={onAction}
>
  <div
    slot="main"
    class="w-full overflow-y-scroll"
    style={`height: 100%; max-height: ${paneHeight}px !important; min-height: ${paneHeight}px`}
  >
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi2</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi2</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi2</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>hi</div>
    <div>last----------</div>
  </div>
</LedgerPane>
