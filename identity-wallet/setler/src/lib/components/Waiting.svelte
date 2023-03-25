<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import Icon from '$lib/components/Icon.svelte';

  export let grace = true;
  export let show = true;

  let graceUp = false; // grace period expired
  onMount(() => {
    if (!browser) {
      return;
    }

    if (grace) {
      setTimeout(() => {
        graceUp = true;
      }, 600);
    } else {
      graceUp = true;
    }
  });
</script>

{#if show}
  {#if graceUp}
    <div
      class="flex h-full w-full bg-gradient-to-b from-slate-50 to-slate-400"
      in:fade
      out:fade
    >
      <div class="m-auto">
        <div class="flex items-center justify-center">
          <Icon
            name="globe-alt"
            class="h-16 w-16 animate-spin text-slate-600"
          />
        </div>
        <slot />
      </div>
    </div>
  {/if}
{/if}
