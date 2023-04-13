<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	export let msg: string;
	export let type = 'success';
	export let noClose = false;
	// export { klass as class };
	// let klass = '';

	let show = true;
	function close() {
		show = false;
		onClose();
	}
	export let onClose = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
</script>

{#if show}
	<div
		class="pointer-events-auto min-w-full md:min-w-[600px] overflow-hidden rounded-2xl border-2 border-slate-200 bg-white ring-1 ring-black ring-opacity-5"
	>
		<div class="p-4">
			<div class="flex items-start">
				<div class="flex-shrink-0">
					<div>
						{#if type === 'success'}
							<Icon name="solid/check-circle" class="h-5 w-5 text-green-500" />
						{:else if type === 'alert'}
							<Icon name="solid/x-circle" class="h-5 w-5 text-red-400" />
						{:else if type === 'error'}
							<Icon name="solid/x-circle" class="h-5 w-5 text-red-400" />
						{:else if type === 'warn'}
							<Icon name="exclaimation-circle" class="h-5 w-5 text-yellow-700" />
						{:else if type === 'info'}
							<Icon name="solid/information-circle" class="h-5 w-5 text-blue-400" />
						{:else if type === 'neutral'}
							<Icon name="solid/information-circle" class="h-5 w-5 text-gray-400" />
						{/if}
					</div>
				</div>
				<div class="ml-3 w-0 flex-1 pt-0.5">
					<div
						class="text-left text-sm font-medium"
						class:text-green-700={type === 'success'}
						class:text-red-700={type === 'alert'}
						class:text-yellow-700={type === 'warn'}
						class:text-blue-700={type === 'info'}
						class:text-gray-700={type === 'neutral'}
					>
						{#if $$slots.default}
							<slot />
						{:else}
							<p class="w-full font-mono">{msg || ''}</p>
						{/if}
					</div>
				</div>
				<div class="ml-4 flex flex-shrink-0">
					<div class="ml-auto" hidden={noClose}>
						<div class="-mx-1.5 -my-1.5">
							<button
								class="inline-flex rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 {{
									success: `text-green-500 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50`,
									alert: `text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50`,
									error: `text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50`,
									warn: `text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-600 focus:ring-offset-yellow-50`,
									info: `text-blue-500 hover:bg-blue-100 focus:ring-blue-600 focus:ring-offset-blue-50`,
									neutral: `text-gray-500 hover:bg-gray-100 focus:ring-gray-600 focus:ring-offset-gray-50`
								}[type]}"
								aria-label="Dismiss"
								on:click|stopPropagation={close}
							>
								<Icon name="solid/x" class="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
