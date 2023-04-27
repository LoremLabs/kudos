<script>
	import '$lib/styles/app.css';
	import '$lib/styles/twemoji.scss';

	import Toasts from '$lib/components/Toasts.svelte';

	// import { onMount } from 'svelte';
</script>

<svelte:head>
	<link rel="icon" href="/favicons/favicon-setler-01.png" />
	<script
		src="https://cdn.usefathom.com/script.js"
		data-spa="auto"
		data-site="HVVFWBWR"
		defer
	></script>
</svelte:head>
<div class="min-h-screen bg-quad w-full">
	<slot />
</div>
<Toasts />
