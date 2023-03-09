<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import { addToast } from '$lib/stores/toasts';

  import Icon from '$lib/components/Icon.svelte';

  export let hidden = [];
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
      {#if !hidden.includes(field?.name)}
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
          {:else if field.type === 'disclose-copy'}
            <input
              type={field.type === 'string' ? 'text' : field.type || 'text'}
              name={field.name}
              disabled={field.disabled}
              value={formData[field.name] ||
                field.defaultValue ||
                field.value ||
                ''}
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
              class:text-slate-50={field.disabled}
            />
            <button
              type="button"
              class="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
              on:click={() => {
                field.disabled = !field.disabled;
              }}
            >
              <Icon
                name={!field.disabled ? 'solid/eye' : 'solid/eye-slash'}
                class="h-4 w-4 text-gray-500"
              />
            </button>
            <button
              type="button"
              on:click={() => {
                navigator.clipboard.writeText(field.value);
                addToast({
                  type: 'info',
                  msg: `Copied to clipboard`,
                  duration: 3000,
                });
              }}
              class="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
            >
              <Icon name="clipboard-copy" class="h-4 w-4 text-gray-500" />
            </button>
            <div class="mt-1 text-xs text-gray-500">
              <slot name="disclose-copy" />
            </div>
          {:else}
            <input
              type={field.type === 'string' ? 'text' : field.type || 'text'}
              name={field.name}
              disabled={field.disabled}
              value={formData[field.name] ||
                field.defaultValue ||
                field.value ||
                ''}
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
      {/if}
    {/each}
  </div>
</form>
