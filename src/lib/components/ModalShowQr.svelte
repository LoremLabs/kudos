<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import { buttonClass, buttonInactiveClass } from '$lib/tokens';
  import QrCode from '$lib/components/QrCode.svelte';
  import { addToast } from '$lib/stores/toasts';

  import { onMount } from 'svelte';

  export let address = '';
  export let open = false;
  export let handleCancel = () => {};
  export let handleConfirm = async () => {
    // console.log('saving', JSON.stringify(formData));
    modalDone(formData);
    // reset
    done = new Promise((resolve) => {
      modalDone = resolve;
    });
    // for qr, close
    handleCancel();
  };

  export let confirmActive = true;
  export let cancelActive = false;

  onMount(() => {
    setValueFromForm();
  });

  let modalDone = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
  export let done = new Promise((resolve) => {
    modalDone = resolve;
  });

  export let form = {
    id: 'qr',
    inputs: [
      // { type: 'integer', displayName: 'Age', name: 'age' },
      {
        name: 'amount',
        required: false,
        type: 'string',
        displayName: 'Amount to request in XRP. Example: 10.5',
      },
      {
        type: 'string',
        name: 'tag',
        required: false,
        displayName: 'Tag (optional)',
      },
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
  let value = '';

  const setValueFromForm = () => {
    let { amount, tag } = formData;

    // check to see if amount is a number
    if (amount) {
      amount = parseFloat(amount);
      if (isNaN(amount)) {
        addToast({
          type: 'error',
          msg: 'Amount must be a number',
          duration: 3000,
        });
        return;
      }
    } else {
      amount = '';
    }

    if (!tag) {
      tag = ''; // optional
    }

    // create Url, add query params
    const searchParams = new URLSearchParams();
    searchParams.set('amount', amount);
    searchParams.set('dt', tag);

    value = `xrpl://${address}?${searchParams.toString()}`; // not quite sure if this complies, but seems to work in xumm? https://github.com/XRPLF/XRPL-Standards/blob/master/XLS-2d/xls-2d-reference.js
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  $: formData && setValueFromForm();
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
    <div class="m-auto flex max-w-xs flex-row items-center justify-center">
      <QrCode {value} additionalText={address} />
    </div>
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
