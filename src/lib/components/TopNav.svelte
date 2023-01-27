<script lang="ts">
  import { onMount } from 'svelte';

  import { browser } from '$app/environment';

  import { getConfig } from '$lib/utils/config';
  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

  import Identicon from '$lib/components/Identicon.svelte';
  import JsPretty from '$lib/components/JSPretty.svelte';

  export let debug = false;
  let ready = false;

  onMount(async () => {
    const config = await getConfig(true); // using cached config
    const ws = await walletStore.init({ passPhrase: config.passPhrase });
    const clearConfig = await clearConfigStore.init();
    ready = true;
  });
</script>

{#if debug}
  <pre><JsPretty obj={$walletStore} /></pre>
{/if}
{#if ready}
  <nav class="overflow-visible bg-slate-900">
    <div class="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
      <div class="relative flex h-12 items-center justify-between">
        <div class="flex items-center px-2 lg:px-0">
          <div class="flex-shrink-0">
            <h2
              class="text-center text-lg font-bold tracking-tight text-gray-50"
            >
              My Identity
            </h2>
          </div>
        </div>
        <div class="">
          <div class="flex items-center">
            <!-- Profile dropdown -->
            <div class="relative ml-4 flex-shrink-0">
              <div>
                <button
                  type="button"
                  class="flex rounded-full bg-gray-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span class="sr-only">Open persona menu</span>
                  <Identicon address={$walletStore.eth.address} />
                </button>
              </div>

              <!--
                Dropdown menu, show/hide based on menu state.
  
                Entering: "transition ease-out duration-100"
                  From: "transform opacity-0 scale-95"
                  To: "transform opacity-100 scale-100"
                Leaving: "transition ease-in duration-75"
                  From: "transform opacity-100 scale-100"
                  To: "transform opacity-0 scale-95"
              -->
              <div
                class="absolute right-0 z-10 mt-2 hidden w-48 origin-top-right rounded-md bg-red-100 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabindex="-1"
              >
                <!-- Active: "bg-gray-100", Not Active: "" -->
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-0">Your Profile</a
                >
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-1">Settings</a
                >
                <a
                  href="#"
                  class="block px-4 py-2 text-sm text-gray-700"
                  role="menuitem"
                  tabindex="-1"
                  id="user-menu-item-2">Sign out</a
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
{/if}
