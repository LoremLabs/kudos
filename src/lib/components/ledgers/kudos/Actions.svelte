<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import Panel from '$lib/components/Panel.svelte';
  let panelOpen: HTMLElement | null = null;
</script>

<div
  class="flex h-12 items-center justify-end border-b border-gray-200 shadow-sm"
>
  <div
    class="mx-2 flex w-full flex-row items-center justify-start text-slate-900"
  >
    <Icon name="key" class="h-6 w-6 -rotate-45 transform text-slate-500" />
    <h2 class="text-xs font-medium">Keys: Kudos</h2>
  </div>
  <div class="text-gray-500">
    <button
      id="panel-open-1"
      class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
      on:click={() => {
        panelOpen = document.getElementById('panel-open-1');
      }}
    >
      <Icon name="upload" class="h-6 w-6" />
    </button>
  </div>

  <div class="text-gray-500">
    <button
      id="panel-open-2"
      class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
      on:click={() => {
        panelOpen = document.getElementById('panel-open-2');
      }}
    >
      <Icon name="globe-alt" class="h-6 w-6" />
    </button>
  </div>

  <div class="mr-4 text-gray-500">
    <button
      id="panel-open"
      class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
      on:click={() => {
        panelOpen = document.getElementById('panel-open');
      }}
    >
      <Icon name="cog" class="h-6 w-6" />
    </button>
  </div>
</div>

<Panel heading="Kudos Settings" bind:opener={panelOpen}>
  <form
    id="advanced-form"
    class="p-5 py-4 sm:py-5"
    autocomplete="off"
    on:submit|preventDefault={() => {}}
  />

  <div slot="footer">
    <button
      on:click={async () => {
        // save config
        console.log('saving config');
        panelOpen = null;
      }}
      type="submit"
      class="cursor-pointer rounded-full border border-gray-300 bg-blue-700 py-2
    px-4 text-sm font-medium text-white
    shadow-sm transition delay-150 ease-in-out hover:bg-gray-700
    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      Save
    </button>
  </div>
</Panel>
