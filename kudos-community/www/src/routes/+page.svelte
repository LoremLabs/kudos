<script>

    import { onMount } from 'svelte';

    // see if the query params contained a favicon
    let faviconItem;
    let favicon = '/favicon';

    const MAX_FAVICONS = 27;

    onMount(() => {
        faviconItem = parseInt(new URLSearchParams(window.location.search).get('favicon'),10);

        // add one
        faviconItem = faviconItem ? faviconItem + 1 : 1;

        // if we're over MAX_FAVICONS, loop back to 1
        faviconItem = faviconItem > MAX_FAVICONS ? 1 : faviconItem;
    });

</script>

<div
	class="flex flex-row absolute top-0 w-full h-screen bg-repeat"
	style="background-image: url(/patterns/kudos-01.svg)"
>
	<div class="w-full m-auto p-4 flex flex-col justify-center items-center h-screen z-10">
		<a href={`?favicon=${encodeURIComponent(faviconItem)}`} target="_top">
			<h1 class="text-3xl lg:text-8xl font-bold text-center z-20">
				kudos<span class="text-gray-400">.</span><span class="text-black">community</span>
			</h1>
		</a>
	</div>
</div>
