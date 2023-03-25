<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import KeyIcon from '$lib/components/KeyIcon.svelte';
  import KudosStartImport from '$lib/components/KudosStartImport.svelte';

  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let panelOpen: HTMLElement | null = null;
  let panelImportOpen: HTMLElement | null = null;

  export let utilsOpen = false;

  let ready = false;
  onMount(async () => {
    ready = true;
  });
</script>

{#if ready}
  <div
    class="mr-3 rounded-t-2xl border-2 border-b-0 border-l-0 border-r-0 border-slate-50 bg-slate-50 dark:border-slate-400 dark:bg-slate-400"
  >
    <div
      class="items-justify-center flex h-16 items-center justify-end border-b border-gray-200 shadow-sm dark:border-slate-600"
    >
      <div
        class="mx-2 flex w-full flex-row items-center justify-start space-x-2 text-slate-900"
      >
        <div class="flex flex-row items-center justify-start">
          <ol class="ml-2 flex items-center space-x-2">
            <li>
              <div>
                <span class="text-sm font-bold text-slate-700">Ident</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
      <div class="mx-2 text-gray-500">
        <button
          id="panel-open-1"
          class="rounded-full p-2 hover:bg-slate-300 focus:outline-none"
          class:bg-slate-200={utilsOpen}
          class:rotate-45={utilsOpen}
          on:click={() => {
            dispatch('action', { action: 'utils:add' });
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
  </div>
{/if}
