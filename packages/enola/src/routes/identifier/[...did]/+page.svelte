<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#if false}
	<div><pre class="whitespace-normal">{@html JSON.stringify(data)}</pre></div>
{/if}

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
					{data.props?.did}
				</p>
				<h2 class="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-6xl">
					Identifier Details
				</h2>
			</div>
		</div>
	</main>
</div>
