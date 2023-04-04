<script>
	import '$lib/styles/app.css';

	import { onMount } from 'svelte';

	// see if the query params contained a favicon
	let faviconItem;
	let favicon = '/favicon';

	onMount(() => {
		faviconItem = new URLSearchParams(window.location.search).get('favicon');

		// add leading zeros
		favicon = faviconItem
			? `/favicon?favicon=${encodeURIComponent(faviconItem.padStart(1, '0'))}`
			: '/favicon';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="min-h-screen bg-[#F4F3ED] w-full">
	<slot />
</div>
