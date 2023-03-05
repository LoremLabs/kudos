<script>
	import IdentityLink from '$lib/components/IdentityLink.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#if false}
	<div><pre class="whitespace-normal">{@html JSON.stringify(data)}</pre></div>
{/if}

<div class="w-full min-h-screen bg-cyan-500 flex flex-row items-center justify-center">
	<div class="p-2 md:p-8 m-4">
		<div class="w-full m-auto flex flex-col justify-center items-start max-w-xl">
			<div
				class="divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 rounded-2xl w-full bg-cyan-50 p-8 py-16"
			>
				<div>
					<div class="flex flex-row justify-between -m-2">
						<button
							on:click={() => {
								// TODO: make client side only?
								// window.location.href = new URL(data.cursor?.prev, window.location.href).pathname;
								var searchParams = new URLSearchParams(window.location.search);
								searchParams.set('start', data.cursor?.prev || 0);
								window.location.search = searchParams.toString();
							}}
							class="inline-flex items-center px-3 py-2 m-4 text-sm font-medium text-cyan-900 bg-cyan-200 border border-transparent rounded-full shadow-sm hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
							class:invisible={typeof data.cursor?.prev === 'undefined'}
						>
							<span>←</span>
						</button>
						<button
							on:click={() => {
								// TODO: make client side only?
								// window.location.href = new URL(data.cursor?.prev, window.location.href).pathname;
								var searchParams = new URLSearchParams(window.location.search);
								searchParams.set('start', data.cursor?.next || 0);
								window.location.search = searchParams.toString();
							}}
							class="inline-flex items-center px-3 py-2 m-4 text-sm font-medium text-cyan-900 bg-cyan-200 border border-transparent rounded-full shadow-sm hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
							class:invisible={typeof data.cursor?.next === 'undefined'}
						>
							<span>→</span>
						</button>
					</div>
					<div class="flex flex-row pt-12 pb-20">
						<div class="text-center m-auto">
							<div class="flex flex-row items-center justify-center m-auto">
								<p class="text-base font-semibold leading-7 text-cyan-600">
									{data.props?.did}
								</p>
								<IdentityLink identifier={data.props?.did} />
							</div>
							<h2 class="m-auto text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mx-12">
								Identifier Details
							</h2>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
