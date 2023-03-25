<script lang="ts">
  // import { createEventDispatcher } from 'svelte';

  // import Icon from '$lib/components/Icon.svelte';

  // const dispatch = createEventDispatcher();
  import { Tabs } from '$lib/components/Tabs';

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;
  export let activeSection = '';

  let innerWidth = 0;
  let innerHeight = 0;
  let mainWidth = 0;

  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  $: mainWidth = innerWidth - sidebarWidth - 12;
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="h-full pt-2">
  <div class="mt-2 flex h-full w-full flex-row justify-start overflow-auto">
    <div class="flex w-full flex-col bg-slate-900">
      <Tabs bind:active={activeSection} class="">
        <div id="inner-action" class="">
          <slot name="actions" />
        </div>
        <div id="inner-main" class="mr-3 min-h-screen bg-slate-50">
          <slot name="main" />
        </div>
      </Tabs>
    </div>
  </div>
</div>
