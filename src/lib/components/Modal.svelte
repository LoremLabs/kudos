<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { browser } from '$app/environment';
    import Icon from '$lib/components/Icon.svelte';
    import { focusTrap } from '$lib/utils/focus-trap';
  
    export let open = false;
    export let ariaLabelledBy: string;
    let klass = `max-w-lg bg-white rounded-sm pl-4 pt-5 pb-4 pr-8 shadow-xl sm:p-6`;
    export { klass as class };
  
    const dispatch = createEventDispatcher();
  
    let panel: HTMLElement;
    let itemToFocus: HTMLElement | null = null;
  
    export function show() {
      if (!browser || open) return;
      const activeElem = document.activeElement;
      if (activeElem instanceof HTMLElement) {
        itemToFocus = activeElem;
      }
      open = true;
      dispatch('show');
    }
  
    export function hide() {
      if (!open) return;
      if (itemToFocus) {
        itemToFocus.focus();
        itemToFocus = null;
      }
      open = false;
      dispatch('hide');
    }
  
    $: if (open) {
      show();
    } else if (!open) {
      hide();
    }
  
    function handleOutsideClick(ev: MouseEvent) {
      if (!open || !ev.target) return;
      if (panel.contains(ev.target as Node)) return;
      if (
        ev.target instanceof HTMLElement &&
        ev.target.classList.contains('backdrop')
      ) {
        hide();
        ev.preventDefault();
      }
    }
    function handleKeypress(ev: KeyboardEvent) {
      if (open && ev.key === 'Escape') {
        hide();
        ev.preventDefault;
      }
    }
  </script>
  
  <svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />
  
  {#if open}
    <div
      transition:fade={{ duration: 150 }}
      role="dialog"
      aria-modal={true}
      aria-labelledby={ariaLabelledBy}
      class="fixed inset-0 h-full overflow-hidden z-50 shadow-2xl"
      use:focusTrap
    >
      <div
        class="backdrop fixed inset-0 w-full h-full bg-gray-300/90 cursor-pointer"
      />
      <div class="w-full h-full overflow-hidden flex p-2" bind:this={panel}>
        <div
          class="flex-auto overflow-y-auto overscroll-y-contain flex flex-col mx-auto mt-12 mb-auto sm:my-auto max-h-[95vh] relative {klass}"
        >
          <slot />
          <slot name="close">
            <button
              type="button"
              class="bg-red-100 rounded-sm text-red-400 hover:text-red-500 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-gray-300 absolute right-0 top-0 mt-4 mr-4"
              on:click={hide}
              aria-label="Close"
              title="Close"
            >
              <Icon class="text-gray-500 h-6 w-6" name="x" />
            </button>
          </slot>
        </div>
      </div>
    </div>
  {/if}
  