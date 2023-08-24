<script lang="ts">
	import { addToast } from '$lib/stores/toasts';

	export let code = '';
	export let toCopy = '';
	export let hiddenCode = '';
	export let language = 'bash';
	export let isShell = false;
	export let mode = 'hidden';
	export { klass as class };
	let klass = '';

	let show = true;
	function close() {
		show = false;
		onClose();
	}
	export let onClose = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function

	export let copyText = () => {
		const copyThis = toCopy || code;
		navigator.clipboard.writeText(copyThis);
		addToast({
			type: 'info',
			msg: `Copied to clipboard`,
			duration: 3000
		});
	};
</script>

<div class={`block h-full w-full bg-gray-900 p-6 rounded-lg group text-gray-400 ${klass}`}>
	<div class="invisible group-hover:visible flex flex-row-reverse -mt-3">
		<button
			class="mx-2"
			on:click={() => {
				copyText();
			}}
		>
			Copy
		</button>
		{#if mode !== 'display'}
			<button
				on:click={() => {
					mode = mode === 'hidden' ? 'shown' : 'hidden';
				}}
			>
				Show
			</button>
		{/if}
	</div>
	<pre class="overflow-scroll font-mono text-xs"><code
			class="language-{language} overflow-scroll selection:bg-pink-200 selection:text-pink-900"
			>{#if mode !== 'hidden'}{#if isShell}% {/if}<span
					style="user-select: all;"
					on:click={copyText}>{code}</span
				>{:else}{hiddenCode}{/if}</code
		></pre>
</div>
