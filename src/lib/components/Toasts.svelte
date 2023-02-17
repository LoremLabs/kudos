<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  import { toasts } from '$lib/stores/toasts';

  import Callout from '$lib/components/Callout.svelte';
</script>

<div
  aria-live="assertive"
  class="pointer-events-none fixed inset-0 z-[100] flex items-end px-4 py-6 sm:items-start sm:p-6"
>
  <div class="flex w-full flex-col items-end space-y-4">
    {#each $toasts as toast (toast.id)}
      <button
        class="cursor-pointer"
        transition:fly={{
          delay: 0,
          duration: 300,
          x: 0,
          y: -50,
          opacity: 0.1,
          easing: backOut,
        }}
      >
        <Callout msg={toast.msg} type={toast.type} />
      </button>
    {/each}
  </div>
</div>
