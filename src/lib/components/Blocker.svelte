<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import Icon from '$lib/components/Icon.svelte';
  //   import Modal from '$lib/components/Modal.svelte';
  //   import Waiting from '$lib/components/Waiting.svelte';

  export let grace = false;
  export let active = false;

  let graceUp = false; // grace period expired
  onMount(() => {
    if (!browser) {
      return;
    }

    if (grace) {
      setTimeout(() => {
        graceUp = true;
      }, 600);
    } else {
      graceUp = true;
    }
  });
</script>

{#if active}
  <div
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal={true}
    class="fixed inset-0 z-50 h-full overflow-hidden shadow-2xl"
  >
    <div
      class="backdrop fixed inset-0 h-full w-full cursor-pointer bg-gray-300/50"
    />
    <div class="flex h-full w-full overflow-hidden p-2">
      <div
        class="relative mx-auto mt-12 mb-auto flex h-full max-h-[100vh] flex-auto flex-col overflow-y-auto overscroll-y-contain rounded-xl sm:my-auto"
      >
        <slot />

        <div class="h-full opacity-50">
          <div
            class="flex h-full w-full bg-gradient-to-b from-slate-50 to-slate-400"
            in:fade
            out:fade
          >
            <div class="m-auto">
              <div class="flex items-center justify-center">
                <Icon
                  name="globe-alt"
                  class="h-16 w-16 animate-spin text-slate-600"
                />
              </div>
              Switching Personas...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
