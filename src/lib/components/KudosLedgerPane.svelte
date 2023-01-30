<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import LedgerPane from '$lib/components/LedgerPane.svelte';

  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };
</script>

<LedgerPane on:command={onCommand} on:action={onAction}>
  <div slot="main">Hi there</div>
</LedgerPane>
