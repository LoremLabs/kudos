<script lang="ts">
  import { onMount } from 'svelte';

  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import { noop } from '$lib/utils/noop';
  import {
    buttonClass,
    buttonInactiveClass,
    buttonColorClass,
  } from '$lib/tokens';
  import { currentCohort } from '$lib/utils/date';
  import { signKudos } from '$lib/distList/signature';

  import { walletStore } from '$lib/stores/wallet';

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
  export let agree = false;

  export let step = 0;
  export let cohorts = {};
  let kudos = [];

  const updateKudos = () => {
    Object.keys(cohorts).forEach((cohort) => {
      kudos = [...kudos, ...cohorts[cohort]];
    });
    // console.log({ kudos });

    // filter kudos with 0 weight
    kudos = kudos.filter((kudo) => kudo.weight > 0);
  };

  onMount(() => {
    agree = false;
    updateKudos();
  });

  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  const doSignKudos = async () => {
    step = step + 1;
    const startTs = Date.now();
    await noop();
    const wallet = $walletStore?.keys?.kudos;
    console.log({ kudos });
    // for each distListItem, sign with our private key
    const signed = await Promise.all(
      kudos.map(async (item) => {
        const sig = await signKudos(item, wallet);
        await noop();
        return {
          ...item,
          sig,
        };
      })
    );
    console.log({ signed });
    const endTs = Date.now();
    // wait a bit to show the spinner if we haven't waited so far
    const wait = Math.max(0, 750 - (endTs - startTs));
    setTimeout(() => {
      step = step + 1;
    }, wait);
  };

  $: kudos && updateKudos();
  $: !open && (agree = false);
  $: !open && (step = 0);
</script>

<svelte:body on:keydown={handleKeydown} />

<Modal
  bind:open
  on:hide={() => handleCancel()}
  ariaLabelledBy="modal-headline"
  class="ml-3 mr-6 max-w-7xl rounded-2xl bg-cyan-900 pl-4 pt-5 pr-8 pb-16 shadow-xl sm:p-6"
>
  <div class="mt-0 ml-4 pt-0 text-left">
    <slot name="header" />
    <div class="mb-6 rounded-2xl bg-cyan-700 py-6">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        {#if step === 0}
          <div class="mx-auto max-w-2xl lg:mx-0">
            <h2
              class="text-4xl font-bold tracking-tight text-white sm:text-5xl"
            >
              Give Public Thanks
            </h2>
            <p class="mt-4 text-lg leading-6 text-gray-300">
              This is a great way to recognize those whose work you depend upon.
              We'll cryptographically sign your kudos and <b>publish them</b> to
              the global leader board for all to see.
            </p>
          </div>
        {:else if step === 1}
          <div class="mx-auto lg:mx-0">
            <div class="flex flex-row justify-between">
              <h2 class="text-5xl font-bold tracking-tight text-white">
                Signing Your Kudos...
              </h2>
              <Icon
                name="globe-alt"
                class="h-12 w-12 animate-spin text-cyan-100"
              />
            </div>
          </div>
        {:else if step === 2}
          <div class="mx-auto lg:mx-0">
            <div class="flex flex-row justify-between">
              <h2 class="text-5xl font-bold tracking-tight text-white">
                what now
              </h2>
              <Icon
                name="globe-alt"
                class="h-12 w-12 animate-spin text-cyan-100"
              />
            </div>
          </div>
        {/if}
        {#if step === 0}
          <div
            class="mt-8 flex flex-row items-center justify-between rounded-xl bg-cyan-600 p-3"
          >
            <input
              type="checkbox"
              class="h-7 w-7 rounded-full border-0 text-cyan-700 ring-0 focus:ring-0"
              value="true"
              bind:checked={agree}
            />
            <div class="mx-4 max-w-2xl text-cyan-900">
              <button on:click={() => (agree = !agree)} class="text-left">
                I understand that this is a public action and that my kudos will
                be published with my signature to the global leader board.
              </button>
            </div>
            <button
              on:click={() => {
                if (agree) {
                  doSignKudos();
                } else {
                  shake = true;
                  setTimeout(() => {
                    shake = false;
                  }, 500);
                }
              }}
              type="button"
              class={`cursor-pointer rounded-full border border-cyan-600 bg-gray-300 py-2 px-4 text-sm font-medium text-cyan-900 shadow-sm transition delay-150 ease-in-out hover:bg-gray-200 focus:outline-none focus:ring-0 focus:ring-gray-500 focus:ring-offset-0`}
              class:animate-shake={shake}
            >
              <div class="flex flex-row">
                Next
                {#if processing}
                  <span
                    aria-label={'processing'}
                    class="ml-2 mr-3 animate-spin"
                  >
                    <Icon name="misc/spinner" class="h-5 w-5 text-slate-500" />
                  </span>
                {:else}
                  <Icon name="chevron-right" class="h-5 w-5 text-cyan-600" />
                {/if}
              </div>
            </button>
          </div>
        {:else if step === -1}
          <!-- -->
        {/if}
      </div>
    </div>
  </div>
  <div class="mt-4 ml-4 flex hidden flex-row-reverse">
    <button
      on:click={handleConfirm}
      type="button"
      class={`${buttonClass} border-0 bg-gray-500 hover:bg-gray-600`}
      class:animate-shake={shake}
    >
      <div class="flex flex-row">
        Next
        {#if processing}
          <span aria-label={'processing'} class="ml-2 mr-3 animate-spin">
            <Icon name="misc/spinner" class="h-5 w-5 text-slate-500" />
          </span>
        {:else}
          <Icon name="chevron-right" class="h-5 w-5 text-white" />
        {/if}
      </div>
    </button>
    {#if cancelActive}
      <button
        on:click={() => {
          open = false;
        }}
        type="button"
        class={`${buttonInactiveClass} mr-2 border-0`}
      >
        Cancel
      </button>
    {/if}
  </div>
  <div class="flex flex-row justify-center">
    {#each [0, 1, 2] as modalStep}
      <!-- circle svg -->
      <div
        class:text-gray-300={step < modalStep}
        class:text-cyan-100={step >= modalStep}
      >
        <button
          on:click={() => {
            if (modalStep < step) {
              step = modalStep;
            }
          }}
        >
          <svg
            class="mx-4 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="12" fill="currentColor" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
</Modal>
