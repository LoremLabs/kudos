<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import { buttonClass, buttonInactiveClass } from '$lib/tokens';

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
        name: 'name',
        required: true,
        type: 'string',
        displayName: 'Persona Name',
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
        class={`${buttonInactiveClass} mr-2`}
      >
        Cancel
      </button>
    {/if}
  </div>
</Modal>
