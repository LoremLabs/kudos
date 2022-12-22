<script>
  import Icon from '$lib/components/Icon.svelte';

  let url = '';
  let error = '';
  let working = false;

  const handleNewUrl = () => {
    working = !working;
    console.log({ url, working });
    // download url locally to tmp location
    // call new kudos window with that tmp file

    // show alert box
    error = 'Not implemented yet.';
    setTimeout(() => {
      error = '';
    }, 3000);
  };
</script>

<div class="h-screen bg-white shadow sm:rounded-lg">
  <div class="px-4 py-5 sm:p-6">
    <h3 class="text-lg font-medium leading-6 text-gray-900">
      Import Kudos from Web Address
    </h3>
    <div class="mt-2 max-w-xl text-sm text-gray-500">
      <p>
        Enter the URL of a kudos database file <span class="font-mono"
          >(kudos.db)</span
        >.
      </p>
    </div>
    <form class="mt-5 sm:flex sm:items-center" on:submit={handleNewUrl}>
      <div class="w-full">
        <label for="url" class="sr-only">Url</label>
        <input
          type="url"
          name="url"
          bind:value={url}
          spellcheck="false"
          id="url"
          autofocus
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
          placeholder="https://github.com/lorem-labs/kudos.db"
        />
      </div>
      <button
        type="submit"
        on:click={handleNewUrl}
        class="mt-3 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        ><div class="flex">
          Fetch

          {#if working}
            <Icon name="misc/spinner" class="py mx-2 h-4 w-4 animate-spin" />
          {/if}
        </div>
      </button>
    </form>
    {#if error}
    <div class="my-2 border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <Icon name="mini/exclamation-triangle" class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              {error}
            </p>
          </div>
        </div>
      </div>
      
    {/if}
  </div>
</div>
