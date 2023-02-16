<script>
  import { createPopperActions } from 'svelte-popperjs';
  export let text = '';
  export let placement = 'right';
  export let delay = 100;
  let klass = '';
  export { klass as class };

  const [popperRef, popperContent] = createPopperActions({
    placement,
    strategy: 'fixed',
  });
  const extraOpts = {
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  };

  let showTooltip = false;
  let delayTimeout = null;
</script>

<div
  class="w-full"
  style="display: inline-block"
  use:popperRef
  on:mouseenter={() => {
    // if we have a delay, we need to wait for it to show the tooltip
    if (delay) {
      delayTimeout = setTimeout(() => {
        showTooltip = true;
      }, delay);
    } else {
      showTooltip = true;
    }
  }}
  on:mouseleave={() => {
    showTooltip = false;
    if (delayTimeout) {
      clearTimeout(delayTimeout);
    }
  }}
>
  <slot />
</div>
{#if showTooltip}
  <div
    id="tooltip"
    role="tooltip"
    use:popperContent={extraOpts}
    class="font-md rounded-full bg-white font-bold text-black {klass}"
  >
    {text}
    <div id="arrow" data-popper-arrow />
  </div>
{/if}

<style>
  #arrow,
  #arrow::before {
    position: absolute;
    width: 8px;
    height: 8px;
    background: inherit;
  }

  #arrow {
    visibility: hidden;
  }

  #arrow::before {
    visibility: visible;
    content: '';
    transform: rotate(45deg);
  }

  :global(#tooltip[data-popper-placement^='top']) > #arrow {
    bottom: -4px;
  }

  :global(#tooltip[data-popper-placement^='bottom']) > #arrow {
    top: -4px;
  }

  :global(#tooltip[data-popper-placement^='left']) > #arrow {
    right: -4px;
  }

  :global(#tooltip[data-popper-placement^='right']) > #arrow {
    left: -4px;
  }
</style>
