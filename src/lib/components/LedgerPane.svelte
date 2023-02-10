<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import Icon from '$lib/components/Icon.svelte';

  const dispatch = createEventDispatcher();

  export let sidebarWidth = 0;
  export let sidebarHeight = 0;
  export let showCommander = true;

  let innerWidth = 0;
  let innerHeight = 0;

  let commanderActive = false;
  let inputActive = false;
  let commandInput = '';
  let mainWidth = 0;

  const onCommand = async (e: CustomEvent) => {
    console.log('onCommand', e.detail);
  };

  const onAction = async (e: CustomEvent) => {
    console.log('onAction', e.detail);
  };

  $: mainWidth = innerWidth - sidebarWidth - 12;
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="h-full w-full">
  <div class="flex h-full flex-col justify-end">
    <div class="h-full">
      <div class="mt-2 flex h-full w-full flex-row justify-start overflow-auto">
        <slot name="main" />
      </div>
    </div>
    {#if showCommander}
      <div
        class={`absolute -bottom-6 right-0 mx-1 h-32 w-full p-2`}
        style={`width: ${mainWidth}px;`}
      >
        <div
          class="flex h-16 w-full flex-row items-center rounded-lg p-2"
          class:shadow-md={commanderActive}
          class:bg-white={commanderActive}
          class:bg-gray-100={!commanderActive}
        >
          {#if false}
            <div>
              <button
                class="flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
            </div>
          {/if}
          <div class="ml-1 flex-grow">
            <div class="relative w-full">
              <textarea
                rows="3"
                autocomplete="off"
                placeholder="Type a command or /help"
                autocorrect={'off'}
                autocapitalize={'off'}
                spellcheck={'false'}
                bind:value={commandInput}
                on:keyup={(e) => {
                  // console.log('keydown', e.key);
                  if (e.key === 'Escape') {
                    commandInput = '';
                    inputActive = false;
                  }
                  // submit on enter
                  if (e.key === 'Enter') {
                    if (!e.shiftKey) {
                      // remove final newline
                      const command = commandInput.replace(/\n$/, '');
                      console.log('dispatch', command);
                      dispatch('command', { command });
                      inputActive = false;
                      commandInput = '';
                    }
                  }
                }}
                on:input={() => {
                  if (commandInput.length > 0) {
                    inputActive = true;
                  } else {
                    inputActive = false;
                  }
                }}
                on:focus={() => {
                  commanderActive = true;
                }}
                on:blur={() => {
                  commanderActive = false;
                }}
                class="border-0.5 flex h-10 w-full rounded border-transparent pl-4 font-mono text-sm focus:border-gray-100 focus:ring-0"
                class:bg-gray-100={commanderActive}
                class:bg-gray-200={!commanderActive}
              />
              <button
                class="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-gray-400 hover:text-gray-600"
                on:click={() => dispatch('command', { command: 'foo' })}
              >
                <svg
                  class="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="ml-3">
            <button
              class="flex flex-shrink-0 items-center justify-center rounded-full py-2 pr-2 text-white hover:bg-blue-600"
              class:bg-blue-700={inputActive}
              class:bg-gray-400={!inputActive}
              on:click={() => {
                dispatch('command', { command: commandInput });
                inputActive = false;
                commandInput = '';
              }}
            >
              <span class="ml-2">
                <Icon
                  name="paper-airplane"
                  class="-mt-px h-5 w-5 -rotate-45 transform"
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
