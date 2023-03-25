<script lang="ts">
  import SlidingPanel from '$lib/components/SlidingPanel.svelte';
  import Icon from '$lib/components/Icon.svelte';

  export let opener = false;
  export let heading: string;
  export let nopadding = false;
  let klass = `bg-white`;
  export { klass as class };
</script>

<SlidingPanel
  bind:opener
  modal
  closeOnEscape
  closeOnBackdropClick
  class="z-20 mt-10 w-[95vw] max-w-2xl scroll-p-12 rounded-lg border-l-2 border-t-2 border-gray-200 bg-white shadow-xl"
>
  <div
    slot="header"
    class="flex items-center justify-between bg-gray-100 py-3 px-4 sm:px-6"
    let:ariaLabelId
  >
    <h2 class="text-lg font-bold text-black" id={ariaLabelId}>{heading}</h2>
    <button
      type="button"
      class="rounded-full bg-gray-100 p-2 text-gray-500 outline-none
       hover:scale-110
        hover:bg-gray-300 hover:text-black hover:text-black
        focus:scale-110 focus:bg-gray-200 focus:text-black"
      on:click={() => (opener = null)}
      aria-label="Close"
      title="Close"
    >
      <Icon class="h-6 w-6 p-1" name="x" />
    </button>
  </div>

  <!-- Hide default close button -->
  <div slot="close" />

  <div class={`flex h-full flex-col ${klass}`} class:p-4={!nopadding}>
    <slot />
  </div>

  <div
    slot="footer"
    class="fixed absolute bottom-0 flex w-full flex-row items-center justify-end border-t bg-slate-100 p-4"
  >
    {#if $$slots.footer}
      <slot name="footer" />
    {:else}
      <button
        on:click={() => (opener = null)}
        type="button"
        class="cursor-pointer rounded-full border border-gray-300 bg-gray-200 py-2
        px-4 text-sm font-medium text-gray-700
        shadow-sm hover:bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Cancel
      </button>
    {/if}
  </div>
</SlidingPanel>
