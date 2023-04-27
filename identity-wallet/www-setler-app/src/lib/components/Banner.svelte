<script lang="ts">
	import { goto } from '$app/navigation';

	export let bannerTxt = 'We have big news!';
	export let bannerTxtSmall = bannerTxt;
	export let linkHref = '';
	export let linkTxt = '';
	export let show = true;
	export let closable = false;
	export let klass = 'bg-cyan-500';
</script>

{#if show}
	<div
		class={`relative mx-2 mt-4 rounded-md text-black ${klass} cursor-pointer`}
		on:click={() => {
			if (linkTxt) {
				goto(linkHref);
			}
		}}
	>
		<div class="mx-auto max-w-7xl py-3 px-3 sm:px-6 lg:px-8">
			<div class="pr-16 text-center sm:px-16">
				<p class="font-medium">
					<span class="md:hidden">{bannerTxtSmall}</span>
					<span class="hidden md:inline">{bannerTxt}</span>
					<span class="inline-block sm:ml-2">
						{#if linkTxt}
							<a href={linkHref} title={linkTxt} class="font-bold underline">
								{linkTxt}
								<span aria-hidden="true"> &rarr;</span>
							</a>
						{/if}
					</span>
				</p>
			</div>
			{#if closable}
				<div
					class="absolute inset-y-0 right-0 flex items-start pt-1 pr-1 sm:items-start sm:pt-1 sm:pr-2"
				>
					<button
						type="button"
						on:click={() => {
							show = !show;
						}}
						class="flex rounded-md p-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black"
					>
						<span class="sr-only">Dismiss</span>
						<!-- Heroicon name: outline/x-mark -->
						<svg
							class="h-6 w-6 text-black"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
