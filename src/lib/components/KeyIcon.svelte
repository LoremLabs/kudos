<script>
  import Identicon from '$lib/components/Identicon.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let klass = 'ml-2 mt-2';

  export let address = '0x0';
  export let diameter = 20;
  export let type = 'kudos';
  export { klass as class };
</script>

<Tooltip
  text={`Key: ${address}`}
  placement="bottom"
  class="z-50 z-50 border border-slate-300 p-1.5 px-2 shadow"
>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="cursor-pointer"
    on:click={() => {
      // copy to clipboard
      navigator.clipboard.writeText(address);
    }}
  >
    <Identicon class={`${klass}`} {diameter} {address} />
  </div>
</Tooltip>
