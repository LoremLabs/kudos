<script>
	import '$lib/styles/app.css';
	import '$lib/styles/twemoji.scss';

	import Toasts from '$lib/components/Toasts.svelte';

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
	<script
		src="https://cdn.usefathom.com/script.js"
		data-spa="auto"
		data-site="TOJPNXQF"
		defer
	></script>
</svelte:head>
<div class="min-h-screen bg-quad w-full">
	<slot />
</div>
<Toasts />
