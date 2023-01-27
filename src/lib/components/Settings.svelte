<script lang="ts">
  import type { IconName } from '$lib/components/Icon.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Tabs, Tab, TabPanel, TabList } from '$lib/components/Tabs';
  let activeSection = 'Ledgers';

  const TABS: { id: string; icon: IconName }[] = [
    { id: 'Ledgers', icon: 'badge-check' },
    { id: 'Channels', icon: 'at-symbol' },
    { id: 'Settings', icon: 'cog' },
  ];
</script>

<Tabs bind:active={activeSection} class="">
  <main class="flex flex-row">
    <TabList
      label="Settings Subnav"
      class="flex flex-1 flex-col items-start gap-2 overflow-x-auto border-r border-gray-200 bg-slate-50 p-2 md:overflow-x-visible"
      orientation="vertical"
    >
      {#each TABS as tab}
        <Tab id={tab.id} class="-mb-2" let:selected>
          <button
            class="group flex w-full items-center gap-3 rounded-sm p-2 text-xs font-medium text-gray-600 hover:border-b-2 hover:text-gray-900"
            class:border-slate-500={selected}
            class:border-b-2={selected}
          >
            <Icon
              name={tab.icon}
              class="h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
            />
            <span>{tab.id}</span>
          </button>
        </Tab>
      {/each}
    </TabList>
    <TabPanel class="min-h-screen w-full bg-slate-100">
      <div class="mx-auto max-w-md sm:max-w-3xl">
        <div>
          <div class="text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h2 class="mt-2 text-lg font-medium text-gray-900">
              Add team members
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              You haven’t added any team members to your project yet.
            </p>
          </div>
          <form class="mt-6 sm:flex sm:items-center" action="#">
            <label for="emails" class="sr-only">Email addresses</label>
            <div class="relative rounded-md shadow-sm sm:min-w-0 sm:flex-1">
              <input
                type="text"
                name="emails"
                id="emails"
                class="block w-full rounded-md border-gray-300 pr-32 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter an email"
              />
              <div class="absolute inset-y-0 right-0 flex items-center">
                <span class="h-4 w-px bg-gray-200" aria-hidden="true" />
                <label for="role" class="sr-only">Role</label>
                <select
                  id="role"
                  name="role"
                  class="h-full rounded-md border-transparent bg-transparent py-0 pl-4 pr-7 text-gray-500 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option>Can edit</option>
                  <option>Can view</option>
                </select>
              </div>
            </div>
            <div class="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0">
              <button
                type="submit"
                class="block w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >Send invite</button
              >
            </div>
          </form>
        </div>
        <div class="mt-10">
          <h3 class="text-sm font-medium text-gray-500">
            Recommended team members
          </h3>
          <ul role="list" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Lindsay Walton</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Front-end Developer</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Courtney Henry</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Designer</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Tom Cook</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Director, Product Development</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Whitney Francis</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Copywriter</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Leonard Krasner</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Senior Designer</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                class="group flex w-full items-center justify-between space-x-3 rounded-full border border-gray-300 p-2 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span class="flex min-w-0 flex-1 items-center space-x-3">
                  <span class="block flex-shrink-0">
                    <img
                      class="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </span>
                  <span class="block min-w-0 flex-1">
                    <span
                      class="block truncate text-sm font-medium text-gray-900"
                      >Floyd Miles</span
                    >
                    <span
                      class="block truncate text-sm font-medium text-gray-500"
                      >Principal Designer</span
                    >
                  </span>
                </span>
                <span
                  class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center"
                >
                  <!-- Heroicon name: mini/plus -->
                  <svg
                    class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                    />
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </TabPanel>
    <TabPanel class="min-h-screen w-full bg-slate-100">1</TabPanel>
    <TabPanel class="min-h-screen w-full bg-slate-100">2</TabPanel>
  </main>
</Tabs>
