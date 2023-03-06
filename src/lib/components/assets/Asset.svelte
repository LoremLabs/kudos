<script>
  import { createEventDispatcher, onMount } from 'svelte';

  import XrpAsset from './XrpAsset.svelte';

  export let type = 'xrpl';
  export let networkName = 'xrpl:livenet';
  export let address = '';
  export let balance = {};
</script>

<div
  style={`min-height: 300px;`}
  class="rounded-2xl border border-cyan-900 border-opacity-25 bg-white dark:bg-slate-50"
>
  {#if networkName && networkName.includes('xrpl')}
    <XrpAsset {networkName} {address} {balance} />
  {/if}
</div>
