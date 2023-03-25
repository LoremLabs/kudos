<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import { buttonClass } from '$lib/tokens';

  export let open = false;
  export let handleCancel = () => {};
  export let handleConfirm = async () => {
    // console.log('saving', JSON.stringify(formData));
    modalDone(formData);
    // reset
    done = new Promise((resolve) => {
      modalDone = resolve;
    });
  };

  export let confirmActive = true;
  export let cancelActive = false;

  let modalDone = (fd: {}) => {
    console.log({ fd });
  };
  export let done = new Promise((resolve) => {
    modalDone = resolve;
  });

  export let form = {
    id: 'mnemonic',
    inputs: [
      // { type: 'integer', displayName: 'Age', name: 'age' },
      {
        name: 'customMnemonic',
        required: true,
        type: 'string',
        displayName: 'Import Custom Mnemonic Words (12-24 words)',
      },
      // {
      //   type: 'string',
      //   name: 'lastName',
      //   required: false,
      //   displayName: 'Last Name',
      // },
      // {
      //   type: 'textarea',
      //   name: 'notes',
      //   displayName: 'Extra Notes',
      //   required: false,
      // },
      // {
      //   type: 'checkbox',
      //   name: 'check',
      //   displayName: 'check this box',
      //   required: false,
      // },
      // {
      //   type: 'select',
      //   name: 'sel',
      //   displayName: 'select thigns',
      //   options: [
      //     {
      //       value: '1',
      //       displayName: 'one',
      //     },
      //     {
      //       value: '2',
      //       displayName: 'two',
      //     },
      //     {
      //       value: '3',
      //       displayName: 'three',
      //     },
      //   ],
      //   required: false,
      // },
    ],
  };

  export let formData = {};

  let processing = false;

  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };
</script>

<svelte:body on:keydown={handleKeydown} />

<Modal
  bind:open
  on:hide={() => handleCancel()}
  ariaLabelledBy="modal-headline"
  class="max-w-7xl rounded-sm bg-white pl-4 pt-5 pr-8 pb-16 shadow-xl sm:p-6"
>
  <div class="mt-3 pt-2 text-center sm:mt-0 sm:ml-4 sm:text-left">
    <slot name="header" />
    <div class="block h-full min-h-[6rem] w-full ">
      <Form {form} bind:formData />
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="solid/fire" class="h-8 w-8 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Danger</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>
              Importing a custom mnemonic will overwrite your existing keys and
              local events.
            </p>
            <p class="mt-2">
              Only do this if you have a backup of your existing data.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="mt-4 ml-4 flex flex-row-reverse">
    <button on:click={handleConfirm} type="button" class={`${buttonClass}`}>
      Ok
      {#if processing}
        <span aria-label={'processing'} class="ml-2 mr-3 animate-spin">
          <Icon name="misc/spinner" class="text-primary-500 h-5 w-5" />
        </span>
      {/if}
    </button>
    {#if cancelActive}
      <button
        on:click={() => {
          open = false;
        }}
        type="button"
        class="mt-3 inline-flex w-full justify-center rounded-sm border border-gray-300 bg-gray-100 px-4 py-2 text-base font-medium text-gray-500 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
      >
        Cancel
      </button>
    {/if}
  </div>
</Modal>
