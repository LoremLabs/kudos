<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import KeyIcon from '$lib/components/KeyIcon.svelte';
  import KudosStartImport from '$lib/components/KudosStartImport.svelte';

  let panelOpen: HTMLElement | null = null;
  let panelImportOpen: HTMLElement | null = null;

  export let walletStore = null;
</script>

{#if walletStore}
  <div
    class="items-justify-center flex h-16 items-center justify-end border-b border-gray-200 shadow-sm"
  >
    <div
      class="mx-2 flex w-full flex-row items-center justify-start space-x-2 text-slate-900"
    >
      <Icon name="key" class="h-6 w-6 -rotate-45 transform text-slate-500" />
      <h2 class="text-xs font-medium">Keys:</h2>
      <div class="flex flex-row items-center justify-start">
        <span class="text-xs font-medium text-slate-600">Kudos</span>
        <KeyIcon type="kudos" address={walletStore.keys.kudos?.address} />
      </div>
    </div>
    <div class="mx-2 text-gray-500">
      <button
        id="panel-open-1"
        class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
        on:click={() => {
          panelImportOpen = document.getElementById('panel-open-1');
        }}
      >
        <Icon name="solid/plus-sm" class="h-6 w-6" />
      </button>
    </div>
    {#if false}
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
    {/if}
  </div>

  <Panel heading="Kudos Import" bind:opener={panelImportOpen}>
    <KudosStartImport />

    <div slot="footer">
      <button
        on:click={async () => {
          // save config
          console.log('saving config');
          panelImportOpen = null;
        }}
        type="submit"
        class="cursor-pointer rounded-full border border-gray-300 bg-gray-700 py-2
    px-4 text-sm font-medium text-white
    shadow-sm transition delay-150 ease-in-out hover:bg-blue-700
    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Close
      </button>
    </div>
  </Panel>
{/if}
