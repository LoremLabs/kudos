<script>
	import '$lib/styles/tailwind.css';
</script>

<div class="min-h-screen w-full">
	<div class="w-full min-h-screen bg-cyan-500">
		<div class="p-2 md:p-8">
			<div class="w-full m-auto flex flex-col justify-center items-start max-w-xl">
				<div
					class="divide-y divide-gray-300 shadow ring-1 ring-black ring-opacity-5 rounded-2xl w-full bg-cyan-50"
				>
					<slot />
				</div>
			</div>
		</div>
	</div>
</div>
