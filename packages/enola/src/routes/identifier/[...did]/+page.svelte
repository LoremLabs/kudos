<script>
	import IdentityLink from '$lib/components/IdentityLink.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#if false}
	<div><pre class="whitespace-normal">{@html JSON.stringify(data)}</pre></div>
{/if}

<div class="w-full min-h-screen bg-cyan-500 flex flex-row items-center justify-center">
	<div class="w-full flex flex-col justify-center items-start max-w-md m-4">
		<div
			class="divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 rounded-2xl w-full p-4 py-6 md:p-8 md:py-16 bg-cyan-50 "
		>
			<div class="flex flex-col pt-12 pb-20">
				<div class="text-center m-auto">
					<h2 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl my-12 max-w-xs">
						Identifier Details
					</h2>
					<div class="flex flex-row items-center justify-center m-auto">
						<p class="text-base font-semibold leading-7 text-cyan-600 break-all">
							{data.props?.did}
						</p>
					</div>
				</div>
				<IdentityLink
					identifier={data.props?.did}
					class="w-8 h-8 m-auto mt-8 text-cyan-900 hover:text-black"
				/>
			</div>
		</div>
	</div>
</div>
