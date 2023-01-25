<script lang="ts">
  import SlidingPanel from '$lib/components/SlidingPanel.svelte';
  import Icon from '$lib/components/Icon.svelte';

  export let opener = false;
  export let heading: string;
  export let nopadding = false;
</script>

<SlidingPanel
  bind:opener
  modal
  closeOnEscape
  closeOnBackdropClick
  class="w-[95vw] max-w-md bg-white scroll-p-12"
>
  <div
    slot="header"
    class="py-6 px-4 bg-gray-100 sm:px-6 flex items-center justify-between"
    let:ariaLabelId
  >
    <h2 class="text-lg font-bold text-black" id={ariaLabelId}>{heading}</h2>
    <button
      type="button"
      class="bg-gray-100 outline-none text-gray-500
        focus:bg-gray-200 focus:text-black focus:scale-110
        hover:bg-gray-200 hover:text-black hover:scale-110"
      on:click={() => (opener = null)}
      aria-label="Close"
      title="Close"
    >
      <Icon class="h-6 w-6 p-1" name="x" />
    </button>
  </div>

  <!-- Hide default close button -->
  <div slot="close" />

  <div class="flex flex-col h-full" class:p-4={!nopadding}>
    <slot />
  </div>

  <div slot="footer" class="p-4 border-t">
    {#if $$slots.footer}
      <slot name="footer" />
    {:else}
      <button
        on:click={() => (opener = null)}
        type="button"
        class="py-2 px-4 border border-gray-300 shadow-sm rounded-full
        text-sm font-medium bg-gray-200 text-gray-700
        hover:bg-gray-50 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Cancel
      </button>
    {/if}
  </div>
</SlidingPanel>
