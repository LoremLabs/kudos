<script>
	import '$lib/styles/app.css';
	import '$lib/styles/twemoji.scss';

	import Toasts from '$lib/components/Toasts.svelte';
</script>

<svelte:head>
	<link rel="icon" href="/favicons/favicon-35.png" />
	<script
		src="https://cdn.usefathom.com/script.js"
		data-spa="auto"
		data-site="TOJPNXQF"
		defer
	></script>
</svelte:head>
<div class="min-h-screen bg-white w-full">
	<slot />
</div>
<Toasts />
