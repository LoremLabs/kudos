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

<div class="flex flex-col items-center justify-center min-h-screen py-2">
	<main class="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
		<div class="py-6 px-6  lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<svg
					viewBox="0 0 1097 845"
					aria-hidden="true"
					class="hidden transform-gpu blur-3xl sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:w-[68.5625rem]"
				>
					<path
						fill="url(#7c63f5ae-130c-4c0f-963f-50ac7fe8d2e1)"
						fill-opacity=".7"
						d="M301.174 646.641 193.541 844.786 0 546.172l301.174 100.469 193.845-356.855c1.241 164.891 42.802 431.935 199.124 180.978 195.402-313.696 143.295-588.18 284.729-419.266 113.148 135.13 124.068 367.989 115.378 467.527L811.753 372.553l20.102 451.119-530.681-177.031Z"
					/>
					<defs>
						<linearGradient
							id="7c63f5ae-130c-4c0f-963f-50ac7fe8d2e1"
							x1="1097.04"
							x2="-141.165"
							y1=".22"
							y2="363.075"
							gradientUnits="userSpaceOnUse"
						>
							<stop stop-color="#6F77FF" />
							<stop offset="1" stop-color="#46FF94" />
						</linearGradient>
					</defs>
				</svg>
				<svg
					viewBox="0 0 1097 845"
					aria-hidden="true"
					class="absolute left-1/2 -top-52 -z-10 w-[68.5625rem] -translate-x-1/2 transform-gpu blur-3xl sm:top-[-28rem] sm:ml-16 sm:translate-x-0"
				>
					<path
						fill="url(#49c00522-612e-41d3-bb32-ce7d1fa28850)"
						fill-opacity=".2"
						d="M301.174 646.641 193.541 844.786 0 546.172l301.174 100.469 193.845-356.855c1.241 164.891 42.802 431.935 199.124 180.978 195.402-313.696 143.295-588.18 284.729-419.266 113.148 135.13 124.068 367.989 115.378 467.527L811.753 372.553l20.102 451.119-530.681-177.031Z"
					/>
					<defs>
						<linearGradient
							id="49c00522-612e-41d3-bb32-ce7d1fa28850"
							x1="1097.04"
							x2="-141.165"
							y1=".22"
							y2="363.075"
							gradientUnits="userSpaceOnUse"
						>
							<stop stop-color="#6F77FF" />
							<stop offset="1" stop-color="#46FF94" />
						</linearGradient>
					</defs>
				</svg>

				<p class="text-base font-semibold leading-7 text-cyan-600">
					<a href={`/leaderboards/${data.subject}`}>{data.subject}</a>
				</p>
				<h2 class="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
					Kudos Leaderboard
				</h2>
			</div>
		</div>

		<div class="px-4 sm:px-6 lg:px-8">
			<div class="my-8 flow-root">
				<div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
						<div class="flex items-end justify-between w-full">
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

						<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
							<table class="min-w-full divide-y divide-gray-300">
								<thead class="bg-gray-50">
									<tr>
										<th
											scope="col"
											class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
											>Rank</th
										>
										<th
											scope="col"
											class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>Identifier</th
										>
										<th
											scope="col"
											class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Score</th
										>
										<th scope="col" class="sr-only">Action</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each data.leaderboard as row}
										<tr>
											<td
												class="whitespace-nowrap py-4 pl-4 pr-3 text-xs font-medium text-gray-900 sm:pl-6"
												>{row.rank.toLocaleString()}</td
											>
											<td
												class="whitespace-nowrap px-3 py-4 text-xs text-gray-500 text-left font-mono"
												>{row.identifier}</td
											>
											<td class="whitespace-nowrap px-3 py-4 text-xs text-right text-gray-500"
												>{row.score.toLocaleString()}</td
											>
											<td
												class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
											>
												<a
													href={`/identifier/${row.identifier}`}
													class="text-cyan-600 hover:text-cyan-900"
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
			</div>
		</div>
	</main>
</div>
