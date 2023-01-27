<script>
  import { onMount } from 'svelte';

  // import Icon from '$lib/components/Icon.svelte';
  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import TopNav from '$lib/components/TopNav.svelte';

  onMount(async () => {
    const config = await getConfig();
    const ws = await walletStore.init({ passPhrase: config.passPhrase });
    const clearConfig = await clearConfigStore.init();
    console.log({ ws, config, clearConfig });
  });

</script>

<div class="mt-4 overflow-visible bg-white">
  <TopNav />
</div>
