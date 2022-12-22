<script>
  import { page } from '$app/stores';
  import { readKudosDb } from '$lib/kudos/db';
  import Icon from '$lib/components/Icon.svelte';
  import Ago from '$lib/components/Ago.svelte';
  import Sankey from '$lib/components/Sankey.svelte';

  import { onMount } from 'svelte';
  import JSPretty from '$lib/components/JSPretty.svelte';
  let file, tmpFile, windowId;

  let processed = false;
  let fundingAmount = 10000;
  let price = '100.00';
  let kudos = [];
  let openKudos = {};
  let visuals = false;
  let settle = false;

  let highlightLinkIndexes = [];

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  let graph = {
    nodes: [{ name: `${formatter.format(fundingAmount / 100)}` }],
    links: [],
  };

  onMount(async () => {
    // get windowId from query params
    const query = new URLSearchParams(window.location.search);
    // const query = new URLSearchParams($page.url);
    if (!query) {
      console.log('no query');
      return;
    }
    windowId = query.get('windowId') || '';
    file = query.get('file') || '';
    tmpFile = query.get('tmpFile') || '';
    // get kudos from db
    try {
      console.log('kudos read', { file });
      kudos = await readKudosDb({ dbFile: file });
      console.log({ kudos });
      console.log({ graph });
    } catch (e) {
      console.log('kudos read error', { e });
    }
    processed = true;
  });

  let width = 50;
  let height = 50;
  let nodePadding = 7;
  let nodeAlign = 'left';
  let highlightedNodes = [];

  const updateGraph = () => {
    // build graph

    // add all the possible nodes first
    let weights = {};
    let totalWeight = 0;
    kudos.forEach((kudo) => {
      console.log({ kudo });
      // add nodes
      if (!graph.nodes.find((node) => node.name === kudo.identifier)) {
        graph.nodes.push({ name: kudo.identifier });
      }
      if (!graph.nodes.find((node) => node.name === kudo.id)) {
        graph.nodes.push({ name: kudo.id });
      }

      weights[kudo.identifier] = (weights[kudo.identifier] || 0) + kudo.weight;
      totalWeight += kudo.weight;
    });

    kudos.forEach((kudo) => {
      // source -> id -> identifier
      const source = 0;
      const target = graph.nodes.findIndex((node) => node.name === kudo.id);
      const share = kudo.weight / totalWeight;
      graph.links.push({ source, target, value: share * fundingAmount });

      const target2 = graph.nodes.findIndex(
        (node) => node.name === kudo.identifier
      );
      const share2 = weights[kudo.identifier] / totalWeight;
      graph.links.push({
        source: target,
        target: target2,
        value: share2 * fundingAmount,
      });
    });

    graph = {
      ...graph,
      // nodes: [...graph.nodes],
      // links: [...graph.links],
    };
  };

  $: kudos && updateGraph();

  $: {
    fundingAmount = parseInt(price, 10) * 100;
    console.log('fundingAmount', { fundingAmount });
    updateGraph();
  }

  $: {
    console.log('z', { highlightLinkIndexes });
    // get the ids of the highlighted nodes
    const getHighlightedNodes = highlightLinkIndexes.map((index) => {
      const link = graph.links[index];
      // get the ids of the source and target nodes
      const source = link.source.name;
      return source;
    });
    highlightedNodes = [...getHighlightedNodes];
  }
</script>

<div class="measure" bind:offsetWidth={width} bind:offsetHeight={height} />
<div class="px-4 sm:px-6 lg:px-8">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-xl font-semibold text-gray-900">Kudos</h1>
      <p class="mt-2 text-sm text-gray-700">
        A collection of {kudos?.length.toLocaleString('en-US')} kudos
        {#if kudos[0]?.createTime}
          from <time class="underline"
            >{new Date(kudos[0].createTime).toLocaleString('en-US')}</time
          >
          to
          <time class="underline"
            >{new Date(kudos[kudos.length - 1].createTime).toLocaleString(
              'en-US'
            )}</time
          >
        {/if}
      </p>

      {#if false}
        <div>
          <label for="price" class="block text-sm font-medium text-gray-700"
            >Price</label
          >
          <div class="relative mt-1 rounded-md shadow-sm">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
            >
              <span class="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              bind:value={price}
              type="text"
              name="price"
              id="price"
              class="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-transparent focus:ring-transparent sm:text-sm"
              placeholder="10.00"
            />
            <div class="absolute inset-y-0 right-0 flex items-center">
              <label for="currency" class="sr-only">Currency</label>
              <select
                id="currency"
                name="currency"
                class="h-full rounded-md border-transparent bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:border-transparent focus:ring-transparent sm:text-sm"
              >
                <option>USD</option>
              </select>
            </div>
          </div>
        </div>
      {/if}
    </div>
    <div class="mt-4 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center">
      <div class="sr-only" id="visuals-label">Visuals</div>
      <button
        type="button"
        on:click={() => {
          visuals = !visuals;
        }}
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        class:bg-gray-600={visuals}
        class:bg-gray-200={!visuals}
        role="switch"
        aria-checked="false"
        aria-labelledby="visuals-label"
      >
        <span
          aria-hidden="true"
          class="inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          class:translate-x-5={visuals}
          class:translate-x-0={!visuals}
        />
      </button>
    </div>

    <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
      <button
        type="button"
        on:click={() => {
          settle = !settle;
        }}
        class="inline-flex items-center justify-center rounded-md border border-transparent bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
      >
        Settle →
      </button>
    </div>
  </div>

  {#if settle}
    <div class="my-8 bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3
          class="text-lg font-medium leading-6 text-gray-900"
          id="settles-label"
        >
          Reward Your Kudos with Public Thanks
        </h3>
        <div class="mt-2 sm:flex sm:items-start sm:justify-between">
          <div class="max-w-xl text-sm text-gray-500">
            <p id="settles-description">
              Kudos can be published to a global leaderboard. This will give
              attention to the people who are contributing the most to your
              community.
            </p>
          </div>
          <div
            class="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-transparent bg-gray-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm"
              >Start Publicize</button
            >
          </div>
        </div>
      </div>
    </div>
    <div class="my-8 bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <div class="sm:flex sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900">
              Send Money to Your Kudos
            </h3>
            <div class="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                This will allow you to send money to your contributors in
                proportion with their kudos. You set a price and we split it
                between your contributors.
              </p>
            </div>
          </div>
          <div
            class="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-transparent bg-gray-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm"
              >Start Transfer</button
            >
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div class="mt-8 scale-[1]">
    {#if processed && visuals}
      <Sankey
        {graph}
        {width}
        {height}
        {nodePadding}
        {nodeAlign}
        bind:highlightLinkIndexes
        extent={[
          [1, 1],
          [width - 1, height - 6],
        ]}
      />
    {/if}
  </div>

  <div class="my-8 flex flex-col">
    <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 px-1 align-middle">
        <div
          class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
        >
          <table
            class="min-w-full table-auto divide-y divide-gray-300 overflow-scroll"
          >
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
              {#each kudos as kudo, i}
                <tr
                  class:bg-cyan-50={openKudos[`k-${i}`]}
                  class:bg-cyan-100={highlightedNodes.includes(kudo.id)}
                  class:font-strong={highlightedNodes.includes(kudo.id)}
                  class="cursor-pointer"
                  on:click={() => {
                    openKudos[`k-${i}`] = !openKudos[`k-${i}`];
                  }}
                >
                  <td
                    class="whitespace-nowrap py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-6"
                    ><Ago at={kudo.createTime} /></td
                  >
                  <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                    >{kudo.cohort}</td
                  >
                  <td
                    class="whitespace-nowrap px-2 py-2 text-sm font-medium text-gray-900"
                    ><div
                      class="overflow-hidden text-ellipsis"
                      class:overflow-visible={openKudos[`k-${i}`]}
                    >
                      {kudo.identifier}
                    </div></td
                  >
                  <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900"
                    >{kudo.weight.toFixed(4)}</td
                  >
                  <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                    ><div
                      class="overflow-hidden text-ellipsis"
                      class:overflow-visible={openKudos[`k-${i}`]}
                    >
                      {kudo.description}
                    </div></td
                  >
                  <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-500"
                    ><div
                      class="overflow-hidden text-ellipsis"
                      class:overflow-visible={openKudos[`k-${i}`]}
                    >
                      {kudo.id}
                    </div></td
                  >
                  <td
                    class="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                  >
                    <a
                      href="#"
                      class="text-cyan-600 hover:text-cyan-900"
                      class:hidden={openKudos[`k-${i}`]}
                      ><Icon name="eye" class="h-4 w-4" /></a
                    >
                  </td>
                </tr>
                {#if openKudos[`k-${i}`]}
                  <tr
                    class="cursor-pointer"
                    on:click={() => {
                      openKudos[`k-${i}`] = !openKudos[`k-${i}`];
                    }}
                  >
                    <td colspan="7">
                      {#if kudo.context}
                        <pre class="bg-slate-50 p-4 text-xs"><JSPretty
                            obj={kudo}
                          /><hr /><JSPretty
                            obj={JSON.parse(kudo.context)}
                          /></pre>
                      {:else}
                        -
                      {/if}
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .measure {
    position: absolute;
    top: 0;
    left: 0;
    width: 80vw;
    height: 50vh;
    pointer-events: none;
    /* background: rgba(255, 0, 0, 0.5); */
  }
</style>
