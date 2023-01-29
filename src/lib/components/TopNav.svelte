<script lang="ts">
  import { onMount } from 'svelte';

  import { browser } from '$app/environment';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import Icon from '$lib/components/Icon.svelte';
  import Identicon from '$lib/components/Identicon.svelte';
  import JsPretty from '$lib/components/JSPretty.svelte';

  export let debug = false;
  let ready = false;
  let showPersonaMenu = false;

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

    const config = await getConfig(true); // using cached config
    const ws = await walletStore.init({ passPhrase: config.passPhrase });
    const clearConfig = await clearConfigStore.init();
    ready = true;
  });
</script>

<svelte:body on:click={handleOutsideClick} on:keydown={handleKeypress} />

{#if debug}
  <pre><JsPretty obj={$walletStore} /></pre>
{/if}
<nav
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
                  class="border-0.5 rounded-full border-gray-900 bg-slate-300 pr-3"
                >
                  <div
                    class="flex items-center justify-center justify-items-center rounded-full text-sm text-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    <span class="sr-only">Open persona menu</span>
                    <Identicon
                      class="mr-2 pt-1.5 pl-1"
                      diameter={20}
                      address={$walletStore.eth.address}
                    />
                    <div class="m-auto text-xs text-gray-900">
                      {#if $clearConfigStore.name}
                        {$clearConfigStore.name}
                      {:else}
                        Persona {$clearConfigStore.id || 1}
                      {/if}
                    </div>
                    <Icon name="chevron-down" class="ml-2 h-3 w-3" />
                  </div>
                </div>
              </button>

              <div
                class="absolute right-0 z-40 mt-2 w-48 origin-top-right rounded-md bg-slate-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabindex="-1"
                class:animate-entering={showPersonaMenu}
                class:animate-leaving={!showPersonaMenu}
              >
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-0">Your Profile</a
                >
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-1">Settings</a
                >
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-400"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-2">Sign out</a
                >
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>
