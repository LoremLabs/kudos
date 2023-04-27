<script lang="ts">
	export let value;
	export let name = 'hp';
</script>

<div class="sr-only">
	<!-- Bots are likely smart enough to ignore aria-hidden inputs. -->
	<input
		aria-label="If you're a human, please leave this field blank"
		type="text"
		{name}
		bind:value
		tabindex="-1"
	/>
</div>
