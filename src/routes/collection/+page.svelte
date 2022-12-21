<script>
  import { page } from "$app/stores";
import { readKudosDb } from "$lib/kudos/db";
import Icon from "$lib/Icon.svelte";
import Ago from "$lib/Ago.svelte";
  import { onMount } from "svelte";

  let file, windowId;

  let kudos = [];

  onMount(async () => {
    console.log('mount!');
    // get windowId from query params
    const query = new URLSearchParams(window.location.search);
    // const query = new URLSearchParams($page.url);
    if (!query) {
        console.log('no query');
        return;
    }
    console.log('mount!3');
    windowId = query.get("windowId") || '';
    file = query.get("file") || '';
    console.log('mount!2');
//    return;
    // get kudos from db
    try {
        console.log('kudos read', {file});
        kudos = await readKudosDb({dbFile: file});
        console.log({kudos});

    } catch (e) {
        console.log('kudos read error', {e});
    }
  });
</script>

<div class="px-4 sm:px-6 lg:px-8">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-xl font-semibold text-gray-900">Kudos</h1>
      <p class="mt-2 text-sm text-gray-700">
        A collection of kudos.
      </p>
    </div>
    <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
        >Export</button
      >
    </div>
  </div>
  <div class="mt-8 flex flex-col">
    <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
        <div
          class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
        >
          <table class="min-w-full divide-y divide-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  class="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >Date</th
                >
                <th
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Cohort</th
                >
                <th
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Identifier</th
                >
                <th
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Weight</th
                >
                <th
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Description</th
                >
                <th
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Id</th
                >
                <th
                  scope="col"
                  class="relative whitespace-nowrap py-3.5 pl-3 pr-4 sm:pr-6"
                >
                  <span class="sr-only">More</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
                {#each kudos as kudo}
              <tr>
                <td
                  class="whitespace-nowrap py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-6"
                  ><Ago at={kudo.createTime} /></td
                >
                <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                >{kudo.cohort}</td
                >
                <td
                  class="whitespace-nowrap px-2 py-2 text-sm font-medium text-gray-900"
                  >{kudo.identifier}</td
                >
                <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900"
                >{kudo.weight.toFixed(3)}</td
                >
                <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                >{kudo.description}</td
                >
                <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                >{kudo.id}</td
                >
                <td
                  class="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                >
                  <a href="#" class="text-cyan-600 hover:text-cyan-900"
                    ><Icon name="eye" class="w-4 h-4" /></a
                  >
                </td>
              </tr>
              {/each}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
