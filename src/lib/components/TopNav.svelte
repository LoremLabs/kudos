<script lang="ts">
  import { onMount } from 'svelte';

  import { browser } from '$app/environment';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import {
    eventsStore,
    // cursorStore,
    lastUpdateStore,
    // scopeStore,
    // countStore,
  } from '$lib/stores/events';

  import {
    activePersonaStore,
    isSwitchingPersonasStore,
  } from '$lib/stores/persona';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import { colorizer } from '$lib/utils/colorizer';
  import ModalCreatePersona from '$lib/components/ModalCreatePersona.svelte';

  import Blocker from '$lib/components/Blocker.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import JsPretty from '$lib/components/JSPretty.svelte';
  import { goto } from '$app/navigation';
  import { noop } from '$lib/utils/noop';

  let createPersonaModal = false;

  let createPersonaPromise: Promise<void>;
  const createPersona = async () => {
    createPersonaModal = true;
    let userData = await createPersonaPromise;
    createPersonaModal = false;
    return userData;
  };

  export let debug = false;
  let ready = false;
  let showPersonaMenu = false;
  let activePersonaId = -1;

  const onSwitchPersona = async () => {
    // TODO: make an interface
    // get the total persona count
    const count = $activePersonaStore?.count || 1;
    // get the current persona index
    const index = $activePersonaStore?.id || 0;
    // get the next persona index
    const nextIndex = (index + 1) % count;
    // get the next persona id
    await noop();
    // await walletStore.changeActivePersona({ id: nextIndex });
    // await noop();
    await clearConfigStore.changeActivePersona({ id: nextIndex });
    lastUpdateStore.set(new Date().toISOString()); // force update
  };

  const onCreatePersona = async () => {
    let personaData = await createPersona(); // get user data from modal
    const { id } = await clearConfigStore.addPersona(personaData);
    // await walletStore.changeActivePersona({ id });
    // await noop();
    await clearConfigStore.changeActivePersona({ id });
    await noop();
  };

  function handleOutsideClick(ev: MouseEvent) {
    // if the click comes from the opener tree we do nothing, otherwise we close the menu
    if (!showPersonaMenu) {
      return;
    }
    if (ev.target.closest('.opener')) {
      return;
    }
    showPersonaMenu = false;
    ev.preventDefault();
  }
  function handleKeypress(ev: KeyboardEvent) {
    if (showPersonaMenu && ev.key === 'Escape') {
      showPersonaMenu = false;
      ev.preventDefault;
    }
  }

  onMount(async () => {
    if (!browser) {
      return;
    }

    //    const config = await getConfig(true); // using cached config

    // init our stores
    // await clearConfigStore.init();
    // await noop();
    // await walletStore.init({
    //   id: $activePersonaStore?.id || 0,
    //   passPhrase: config.passPhrase,
    // });
    // await noop();

    // activePersonaStore.subscribe(async (persona) => {
    //   // if (ws.id != clearConfig.id) {
    //   //   console.log('-------------------w------', ws.id, clearConfig.id);
    //   //     await walletStore.changeActivePersona({ id: clearConfig.id });
    //   //   }
    //   if (persona?.id != activePersonaId) {
    //     console.log('-------------------c------', persona?.id, activePersonaId);
    //     // await walletStore.changeActivePersona({ id: persona?.id });
    //     // await clearConfigStore.changeActivePersona({ id: persona?.id });
    //     activePersonaId = persona?.id;
    //   }
    // });

    ready = true;
  });
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

{#if debug}
  <pre><JsPretty obj={$walletStore} /></pre>
{/if}
<nav
  data-tauri-drag-region
  class="z-30 flex w-full flex-row items-center justify-end justify-items-end overflow-visible bg-slate-900"
>
  <div class="mx-auto w-full px-2">
    <div class="relative flex h-6 items-center justify-between">
      <div class="flex items-center px-12 lg:px-0">
        <div class="flex-shrink-0">
          <h2
            class="text-md text-center font-medium tracking-tight text-gray-50"
          >
            &nbsp;
          </h2>
        </div>
      </div>
      <div class="">
        {#if !ready}
          <div class="animate-pulse text-white transition">
            <div
              class="border-0.5 rounded-full border-gray-900 bg-slate-300 pr-3"
            >
              <div
                class="flex h-8 w-20 items-center justify-start justify-items-center rounded-full text-sm text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                <div
                  class="ml-1 mr-2 h-6 w-6 rounded-full bg-slate-400 pt-1.5 pl-1"
                />
                &nbsp;
              </div>
            </div>
          </div>
        {:else}
          <div class="flex items-center transition">
            <!-- Profile dropdown -->
            <div class="opener relative ml-4 flex-shrink-0">
              <button
                type="button"
                id="user-menu-button"
                aria-expanded="false"
                aria-haspopup="true"
                on:click={() => {
                  showPersonaMenu = !showPersonaMenu;
                }}
              >
                <div
                  class="border-0.5 mr-1 rounded-full border-gray-900 bg-slate-300"
                >
                  <div
                    class="flex items-center justify-center justify-items-center rounded-full text-sm text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    <span class="sr-only">Open persona menu</span>
                    <div
                      class="border-0.5 rounded-full border-gray-900 bg-slate-300"
                    >
                      <div
                        class="flex h-8 w-full items-center justify-start justify-items-center rounded-full text-sm text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                      >
                        <div
                          class="ml-1 mr-2 h-6 w-6 rounded-full pt-1.5 pl-1"
                          style={`background-color:${colorizer(
                            `persona-${$activePersonaStore?.id || 0}`
                          )}`}
                        />
                        <div class="m-auto text-xs text-gray-900">
                          {#if $activePersonaStore?.name}
                            {$activePersonaStore?.name}
                          {:else}
                            Persona {$clearConfigStore?.id || 1}
                          {/if}
                        </div>
                      </div>
                    </div>

                    <Icon name="chevron-down" class="mx-2 h-3 w-3" />
                  </div>
                </div>
              </button>

              <div
                class="absolute right-0 z-40 mt-2 mr-3 w-48 origin-top-right rounded-md bg-slate-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabindex="-1"
                class:hidden={!showPersonaMenu}
                class:animate-entering={showPersonaMenu}
                class:animate-leaving={!showPersonaMenu}
              >
                <button
                  class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                  id="user-menu-item-0"
                  on:click={onCreatePersona}
                >
                  <div class="w-6">
                    <Icon name="mini/plus" class="mr-2 h-4 w-4" />
                  </div>
                  <div class="">Add Persona</div>
                </button>
                {#if $activePersonaStore?.count > 1}
                  <button
                    class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                    id="user-menu-item-0"
                    on:click={onSwitchPersona}
                  >
                    <div class="w-6">
                      <Icon
                        name="mini/arrows-right-left"
                        class="mr-2 h-4 w-4"
                      />
                    </div>
                    <div class="">Switch Persona</div>
                  </button>
                {/if}
                {#if false}
                  <button
                    class="block flex w-full flex-row items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                    id="user-menu-item-1"
                    on:click={() => {
                      showPersonaMenu = false;
                      goto('/app/settings');
                    }}
                  >
                    <div class="w-6">
                      <Icon name="cog" class="mr-2 h-4 w-4" />
                    </div>
                    <div class="">Settings</div>
                  </button>
                {/if}
                <button
                  on:click={() => {
                    showPersonaMenu = false;
                    goto('/logout');
                  }}
                  class="block flex w-full flex-row items-center justify-start border-t border-gray-400 px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                  id="user-menu-item-2"
                >
                  <div class="w-6">
                    <Icon name="logout" class="mr-2 h-4 w-4" />
                  </div>
                  <div class="">Logout</div>
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>
<Blocker active={$isSwitchingPersonasStore} />
<ModalCreatePersona
  cancelActive={true}
  bind:open={createPersonaModal}
  bind:done={createPersonaPromise}
  handleCancel={() => {}}
>
  <div slot="header">
    <h3
      class="text-lg font-black leading-6 text-gray-900"
      id="modal-persona-headline"
    >
      &nbsp;
    </h3>
  </div>
</ModalCreatePersona>
