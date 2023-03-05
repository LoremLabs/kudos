<script>
	import IdentityLink from '$lib/components/IdentityLink.svelte';
	import IdentityShort from '$lib/components/IdentityShort.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#if false}
	<div><pre class="whitespace-normal">{@html JSON.stringify(data)}</pre></div>
{/if}

<svelte:head>
	<title>Kudos Leaderboard for {data.subject}</title>
</svelte:head>
<div class="w-full min-h-screen bg-cyan-500">
	<div class="p-2 md:p-8">
		<div class="w-full m-auto flex flex-col justify-center items-start max-w-xl">
			<div
				class="divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 rounded-2xl w-full bg-cyan-50"
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
							class:invisible={typeof data.cursor?.prev === 'undefined' || data.start === 0}
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
							class:invisible={data.cursor?.next === null}
						>
							<span>→</span>
						</button>
					</div>
					<div class="flex flex-row pt-12 pb-20">
						<div class="text-center m-auto">
							<p class="text-base font-semibold leading-7 text-cyan-600">
								<a href={`/leaderboards/${data.subject}`}>{data.subject}</a>
							</p>
							<h2 class="m-auto text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mx-12">
								Kudos Leaderboard
							</h2>
						</div>
					</div>
					<div class="bg-gray-50 flex flex-row justify-between">
						<div class="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">
							Rank
						</div>
						<div class="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 hidden md:block">
							Identifier
						</div>
						<div class="px-3 py-3.5 text-right text-xs font-semibold text-gray-900">Score</div>
					</div>
				</div>
				<div class="divide-y divide-gray-200 bg-white overflow-hidden break-all">
					{#each data.leaderboard as row}
						<div class="flex flex-row justify-between items-start">
							<div class="py-4 px-2 sm:pr-3 text-xs font-medium text-gray-900 sm:px-6">
								<div class="hidden md:block text-right w-5 mr-3">
									{row.rank.toLocaleString()}.
								</div>
								<div class="text-left flex flex-col md:hidden">
									<div class="flex flex-row">
										<div class="mr-1 break-normal">{row.rank.toLocaleString()}.</div>
										<div class="text-gray-500 font-mono flex flex-row">
											<a
												href={`/identifier/${row.identifier}`}
												class="text-cyan-800 hover:text-cyan-900"
												><IdentityShort identifier={row.identifier} /></a
											><IdentityLink identifier={row.identifier} />
										</div>
									</div>
								</div>
							</div>
							<div
								class="px-1 sm:pr-3 py-4 text-xs text-gray-500 text-left font-mono truncate hidden md:flex w-full flex-row"
							>
								<a href={`/identifier/${row.identifier}`} class="text-cyan-800 hover:text-cyan-900"
									><IdentityShort identifier={row.identifier} /></a
								><IdentityLink identifier={row.identifier} />
							</div>
							<div
								class="whitespace-nowrap pl-1 pr-3 sm:pl-3 py-4 text-xs text-right text-gray-500 font-semibold"
							>
								{row.score.toLocaleString()}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
