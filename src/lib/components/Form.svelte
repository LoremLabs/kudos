<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import Icon from '$lib/components/Icon.svelte';

  export let formData = {};
  export let form = {};
  export let formId = '';
  export let handleSubmit = (fd) => {
    console.log('formData', formData, fd);
  };
  export let debug = false;
  export let submitting = false;
  export { klass as class };
  let klass = 'overflow-scroll block p-4';

  const dispatch = createEventDispatcher();
</script>

{#if debug}
  <pre class="whitespace-pre-wrap">{JSON.stringify(form)}
                
  <div class="text-gray-500">{JSON.stringify(formData)}</div></pre>
{/if}

<form
  on:submit|preventDefault={() => {
    handleSubmit(formData);
  }}
  id={formId}
>
  <div class={klass}>
    {#each form?.inputs as field}
      <div class="block w-full pb-4">
        {#if field.type !== 'submit'}
          <label
            for={`f-${field.name}`}
            class="text-md ml-1 block text-left font-medium capitalize text-gray-700"
            >{field.displayName || field.name}</label
          >
        {/if}
        {#if field.type === 'textarea'}
          <textarea
            id={`f-${field.name}`}
            name={field.name}
            rows={field.rows || 10}
            cols={field.cols || 50}
            class="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 font-mono text-sm leading-tight text-black shadow-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            placeholder={field.placeholder}
            on:input={(e) => {
              formData[field.name] = e.target.value;
              dispatch('changed', {
                name: field.name,
                value: e.target.value,
              });
            }}>{formData[field.name] || ''}</textarea
          >
        {:else if field.type === 'select'}
          <select
            id={`f-${field.name}`}
            name={field.name}
            class="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 font-mono text-sm leading-tight text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            on:change={(e) => {
              formData[field.name] = e.target.value;
              dispatch('changed', {
                name: field.name,
                value: e.target.value,
              });
            }}
          >
            {#each field.options as option}
              <option
                selected={formData[field.name] === option.value}
                value={option.value}>{option.displayName}</option
              >
            {/each}
          </select>
        {:else if field.type === 'submit'}
          {#if submitting}
            <div
              class="m-auto mt-1 flex w-full cursor-pointer items-center justify-center rounded-sm border bg-black px-3 py-2 text-sm leading-tight text-gray-50 shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {field.displayName}
              <Icon
                name="misc/spinner"
                class="ml-2 mr-3 h-4 w-4 animate-spin"
              />
            </div>
          {:else}
            <input
              type={field.type}
              name={field.name}
              value={field.displayName}
              disabled={field.disabled}
              class="mt-1 block w-full cursor-pointer rounded-sm border bg-black px-3 py-2 text-sm leading-tight text-gray-50 shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          {/if}
        {:else if field.type === 'checkbox'}
          <input
            type={field.type}
            name={field.name}
            disabled={field.disabled}
            value={field.value || 'on'}
            checked={field.checked}
            id={`f-${field.name}`}
            autocomplete={field.autocomplete}
            on:input={(e) => {
              formData[field.name] = e.target.value;
              dispatch('changed', {
                name: field.name,
                value: e.target.value,
              });
            }}
            class="my-1 rounded-sm border border-gray-300 font-mono text-xs shadow-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 disabled:bg-gray-50"
          />
        {:else}
          <input
            type={field.type === 'string' ? 'text' : field.type || 'text'}
            name={field.name}
            disabled={field.disabled}
            value={formData[field.name] || field.defaultValue || ''}
            id={`f-${field.name}`}
            autocomplete={field.autocomplete}
            placeholder={field.placeholder}
            autocorrect={field.autocorrect || 'off'}
            autocapitalize={field.autocapitalize || 'off'}
            spellcheck={field.spellcheck || 'false'}
            on:input={(e) => {
              formData[field.name] = e.currentTarget.value;
              field.defaultValue = null;
              dispatch('changed', {
                name: field.name,
                value: e.target.value,
              });
            }}
            class="my-1 w-full rounded-sm border border-gray-300 py-2 px-3 font-mono text-xs shadow-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 disabled:bg-gray-50"
          />
        {/if}
      </div>
    {/each}
  </div>
</form>
