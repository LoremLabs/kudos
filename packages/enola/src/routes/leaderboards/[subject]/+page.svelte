<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#if false}
	<div><pre class="whitespace-normal">{@html JSON.stringify(data)}</pre></div>
{/if}

<svelte:head>
	<title>Kudos Leaderboard for {data.subject}</title>
</svelte:head>

<div class="w-full bg-cyan-900">
	<div class="p-8">
		<div class="w-full m-auto flex flex-col justify-center items-start max-w-xl">
			<table
				class="table-auto divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 rounded-2xl w-full bg-white"
			>
				<thead>
					<tr>
						<th class="text-center" colspan="4">
							<p class="text-base font-semibold leading-7 text-cyan-600">
								<a href={`/leaderboards/${data.subject}`}>{data.subject}</a>
							</p>
							<h2 class="m-auto text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
								Kudos Leaderboard
							</h2>
						</th>
					</tr>
					<tr>
						<th class="text-left">
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
						</th>
						<th class="hidden md:table-cell">&nbsp;</th>
						<th class="text-right" colspan="2">
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
						</th>
					</tr>
					<tr class="bg-gray-50">
						<th
							scope="col"
							class="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6"
							>Rank</th
						>
						<th
							scope="col"
							class="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 hidden md:table-cell"
							>Identifier</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold text-gray-900"
							>Score</th
						>
						<th scope="col" class="sr-only">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.leaderboard as row}
						<tr>
							<td class="py-4 pl-4 pr-3 text-xs font-medium text-gray-900 sm:pl-6"
								><div class="hidden md:table-cell text-right w-5">
									{row.rank.toLocaleString()}.
								</div>
								<div class="text-left flex flex-col md:hidden shrink">
									<div class="flex flex-row">
										<div class="mr-1">{row.rank.toLocaleString()}.</div>
										<div class="text-gray-500 font-mono flex-0 max-w-xs overflow-scroll">
											<a
												href={`/identifier/${row.identifier}`}
												class="text-cyan-800 hover:text-cyan-900">{row.identifier}</a
											>
										</div>
									</div>
								</div>
							</td>
							<td
								class="whitespace-nowrap px-3 py-4 text-xs text-gray-500 text-left font-mono truncate w-18 sm:w-24 md:w-26 hidden md:table-cell"
								><a href={`/identifier/${row.identifier}`} class="text-cyan-800 hover:text-cyan-900"
									>{row.identifier}</a
								>
							</td>
							<td class="whitespace-nowrap px-3 py-4 text-xs text-right text-gray-500 font-semibold"
								>{row.score.toLocaleString()}</td
							>
							<td
								class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 hidden md:table-cell"
							>
								<a href={`/identifier/${row.identifier}`} class="text-cyan-600 hover:text-cyan-900"
									>→<span class="sr-only">details</span></a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
