<script>
  import { createPopperActions } from 'svelte-popperjs';
  export let text = '';
  export let placement = 'right';
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
</script>

<div
  class="w-full"
  style="display: inline-block"
  use:popperRef
  on:mouseenter={() => (showTooltip = true)}
  on:mouseleave={() => (showTooltip = false)}
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
