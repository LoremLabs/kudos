<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  export let value = false;
  export let label: string;
  export let description: string;
  export let id: string;
  export { klass as class };
  let klass = 'w-full gap-4';
</script>

<div class="flex items-center justify-end{klass}">
  <span class="flex flex-grow flex-col">
    <span class="text-sm font-medium text-gray-900" id="{id}-switch-label"
      >{label}</span
    >
    <span class="text-sm text-gray-500" id="{id}-switch-description"
      >{description}</span
    >
  </span>
  <button
    type="button"
    on:click={() => (value = !value)}
    class="focus:ring-success-500 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border border-transparent border-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
    class:bg-gray-200={!value}
    class:bg-gray-500={value}
    aria-checked={value}
    role="switch"
    aria-labelledby="{id}-switch-label"
    aria-describedby="{id}-switch-description"
  >
    <span
      class="pointer-events-none relative inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      class:translate-x-0={!value}
      class:translate-x-5={value}
    >
      <span
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
        class:opacity-0={value}
        class:ease-out={value}
        class:duration-100={value}
        class:opacity-100={!value}
        class:ease-in={!value}
        class:duration-200={!value}
        aria-hidden="true"
      >
        <Icon name="x" class="h-3 w-3 p-px text-gray-400" />
      </span>
      <span
        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
        class:opacity-0={!value}
        class:ease-out={!value}
        class:duration-100={!value}
        class:opacity-100={value}
        class:ease-in={value}
        class:duration-200={value}
        aria-hidden="true"
      >
        <Icon name="check" class="text-success-600 h-3 w-3 p-px" />
      </span>
    </span>
  </button>
</div>
