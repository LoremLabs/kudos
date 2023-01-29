<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/Icon.svelte';
  import { focusTrap } from '$lib/utils/focus-trap';

  /**
   * Element that triggerred the panel. When panel is closed, focus is returned to this element.
   *
   * Set to `null` to close a panel (if implementing custom closing logic).
   * Set to `true` to force open a panel without any element trigger.
   * It is automatically set to `null` when panel is closed, so you can `bind:opener` to access panel state.
   */
  export let opener: HTMLElement | null | true = null;
  /** Location of panel (the panel slides from this direction). */
  export let direction: 'left' | 'right' = 'right';
  /**
   * Disable interaction with content outside the panel.
   * Adds a semi-transparent backdrop to screen.
   */
  export let modal = false;
  /** Color (tailwind class name) for backdrop. */
  export let modalBackground = 'bg-white/60';
  /** Press escape to close modal. Disabled by default for modal. */
  export let closeOnEscape = !modal;
  /** Click the backdrop to close modal. Disabled by default for modal. */
  export let closeOnBackdropClick = !modal;
  let klass = '';
  export { klass as class };

  let panel: HTMLElement;
  let lastOpener = opener;

  function open() {
    if (!opener) {
      throw new Error('Unexpected: opening without trigger');
    }
    if (opener !== true) {
      lastOpener = opener;
    }
  }

  function close() {
    const itemToFocus = opener || lastOpener;
    opener = null;
    if (itemToFocus && itemToFocus !== true) {
      itemToFocus.focus();
    }
  }

  $: if (opener && panel) {
    open();
  } else if (!opener && panel) {
    close();
  }

  function handleOutsideClick(ev: MouseEvent) {
    if (!opener || ev.target === opener || !ev.target) return;
    if (panel.contains(ev.target as Node)) return;
    if (
      modal &&
      !closeOnBackdropClick &&
      ev.target instanceof HTMLElement &&
      ev.target.classList.contains('backdrop')
    ) {
      return;
    }

    close();
    ev.preventDefault();
  }
  function handleKeypress(ev: KeyboardEvent) {
    if (opener && closeOnEscape && ev.key === 'Escape') {
      close();
      ev.preventDefault;
    }
  }
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

{#if opener !== null}
  {#if modal}
    <div
      transition:fade
      class="backdrop fixed inset-0 z-50 h-full w-full {modalBackground}"
      class:cursor-pointer={closeOnBackdropClick}
    />
  {/if}

  <div
    bind:this={panel}
    role="dialog"
    aria-modal={modal}
    aria-labelledby={$$slots.header ? 'slide-over-heading' : undefined}
    class="fixed top-0 z-50 h-full overflow-hidden shadow-2xl"
    class:right-0={direction === 'right'}
    class:left-0={direction === 'left'}
    transition:fly={{
      duration: 300,
      x: (direction === 'right' ? 1 : -1) * 500,
    }}
    use:focusTrap
  >
    <div class="flex h-full w-full overflow-hidden">
      <div
        class="flex min-h-screen flex-auto flex-col overflow-y-auto overscroll-y-contain {klass}"
      >
        <slot name="header" ariaLabelId="slide-over-heading" />
        <slot />
        {#if $$slots.footer}
          <div class="mt-auto"><slot name="footer" /></div>
        {/if}
      </div>
    </div>
    <slot name="close">
      <button
        type="button"
        class="absolute right-1 top-1
        bg-gray-100 text-gray-500 outline-none
        hover:scale-110 hover:bg-gray-200 hover:text-black
        focus:scale-110 focus:bg-gray-200 focus:text-black"
        on:click={close}
        aria-label="Close"
        title="Close"
      >
        <Icon class="h-6 w-6 p-1" name="x" />
      </button>
    </slot>
  </div>
{/if}
