<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import { buttonClass, buttonInactiveClass } from '$lib/tokens';
  import { currentCohort } from '$lib/utils/date';

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
  export let cancelActive = true;

  let shake = false;

  let modalDone = (fd: {}) => {
    console.log({ fd });
  };
  export let done = new Promise((resolve) => {
    modalDone = resolve;
  });

  export let form = {
    id: 'extra',
    inputs: [
      // { type: 'integer', displayName: 'Age', name: 'age' },
      {
        name: 'cohort',
        required: true,
        type: 'text',
        displayName: 'HEY New Cohort Name',
        defaultValue: currentCohort(),
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

  export let formData = {
    cohort: currentCohort(),
  };

  let processing = false;

  // onMount(async () => {
  //   if (!browser) {
  //     return;
  //   }
  // });

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
  class="max-w-7xl rounded-sm bg-white pl-4 pt-5 pr-8 pb-16 shadow-xl dark:bg-slate-300 sm:p-6"
>
  <div class="mt-3 pt-2 text-center sm:mt-0 sm:ml-4 sm:text-left">
    <slot name="header" />
    <div class="block h-full min-h-[6rem] w-full ">
      <div>
        <h4 class="sr-only">Status</h4>
        <p class="text-sm font-medium text-gray-900">
          Migrating MySQL database...
        </p>
        <div class="mt-6" aria-hidden="true">
          <div class="overflow-hidden rounded-full bg-gray-200">
            <div class="h-2 rounded-full bg-cyan-600" style="width: 37.5%" />
          </div>
          <div
            class="mt-6 hidden grid-cols-4 text-sm font-medium text-gray-600 sm:grid"
          >
            <div class="text-cyan-600">Copying files</div>
            <div class="text-center text-cyan-600">Migrating database</div>
            <div class="text-center">Compiling assets</div>
            <div class="text-right">Deployed</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="mt-4 ml-4 flex flex-row-reverse">
    <button
      on:click={handleConfirm}
      type="button"
      class={`${buttonClass}`}
      class:animate-shake={shake}
    >
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
