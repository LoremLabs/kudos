<script>
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  export let editMode = false;
  export let isEditing = false;
  export let value = '';

  export let onKeydown = () => {};
  // export let onInput = () => {};
  export let onBlur = () => {};
  export let thing = {}; // id
  export let inputSize;

  let lastClick = 0;
  let formerValue;
</script>

{#if isEditing}
  <input
    type="text"
    bind:value
    size={inputSize}
    on:keydown={(ev) => {
      if (!formerValue) {
        formerValue = value;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        // blur will trigger onBlur
        ev.target.blur();
        return;
      }
      onKeydown(ev);
    }}
    on:blur={(ev) => {
      onBlur({ ev, formerValue, value });
      formerValue = null;
    }}
    spellcheck="false"
    class="w-full border-0 bg-transparent px-0 font-mono text-xs text-slate-700 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-slate-500 focus:ring-opacity-50"
    on:click|stopPropagation
  />
{:else}
  <button
    class=""
    on:click|stopPropagation={(e) => {
      if (editMode) {
        dispatch('stopOtherEdit');
        return;
      }
      if (lastClick === 0) {
        e.preventDefault();
        lastClick = Date.now();
      } else {
        if (Date.now() - lastClick < 1500) {
          e.preventDefault();
          // turn on editMode
          dispatch('startEdit', { thing });
        }
        lastClick = 0;
      }
    }}
  >
    <slot name="show" />
  </button>
{/if}
