<script lang="ts">
  import { onMount } from 'svelte';

  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import KeyIcon from '$lib/components/KeyIcon.svelte';
  import { addToast } from '$lib/stores/toasts';

  import { noop } from '$lib/utils/noop';
  import {
    buttonClass,
    buttonInactiveClass,
    buttonColorClass,
  } from '$lib/tokens';
  import { currentCohort } from '$lib/utils/date';
  import { signKudos, packageKudos } from '$lib/distList/signature';

  import { walletStore } from '$lib/stores/wallet';
  import { clearConfigStore } from '$lib/stores/clearConfig';

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

  const doPostKudos = async (payload) => {
    console.log({ payload }, '!!!');
    const clearConfig = await clearConfigStore?.init();
    console.log({ clearConfig });
    const identResolver = clearConfig?.identity?.identResolver;
    if (!identResolver) {
      addToast({
        msg: 'Fame resolver not configured. Configure in Settings → Identity',
        type: 'error',
        duration: 3000,
      });

      open = false;
      throw new Error('No ident resolver set');
    }

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
    };

    const gqlQuery = {
      query:
        'mutation submitKudosForFame($payload: String!, $signature: String!, $address: String!, $subject: String) {\n  submitKudosForFame(\n    payload: $payload\n    signature: $signature\n    address: $address\n    subject: $subject\n  ) {\n    status\n    statusCode\n  }\n}',
      variables: {
        payload: payload.message,
        signature: payload.signature,
        address: payload.address,
        subject: '',
      },
      operationName: 'submitKudosForFame',
      extensions: {},
    };

    let results = {};
    try {
      results = await fetch(`${identResolver}/api/v1/gql`, {
        headers,
        method: 'POST',
        body: JSON.stringify(gqlQuery),
      })
        .then((r) => {
          return r.json();
        })
        .catch((e) => {
          console.log('error submitting to gql', e);
          throw e;
        });
    } catch (e) {
      console.log('error submitting to gql', e);
      // addToast({
      //   msg: 'Error submitting Kudos for Fame. Check your network connection and try again.',
      //   type: 'error',
      //   duration: 3000,
      // });
    }
    open = false;
    //     {
    //     "data": {
    //         "submitKudosForFame": {
    //             "status": "success",
    //             "statusCode": 200
    //         }
    //     }
    // }
    if (results && results.data?.submitKudosForFame?.statusCode === 200) {
      addToast({
        msg: 'Kudos for Fame submitted successfully',
        type: 'success',
        duration: 3000,
      });
    } else {
      addToast({
        msg: `Error ${results.data?.submitKudosForFame?.status || ''}`,
        type: 'error',
        duration: 3000,
      });
      throw new Error('Error submitting Kudos for Fame');
    }
  };

  const doPackageKudos = async (items) => {
    const startTs = Date.now();
    const wallet = $walletStore?.keys?.kudos;
    await noop();
    const payload = await packageKudos(items, wallet);
    console.log({ payload });
    const endTs = Date.now();
    // wait a bit to show the spinner if we haven't waited so far
    const wait = Math.max(0, 750 - (endTs - startTs));
    setTimeout(async () => {
      step = step + 1;
      await doPostKudos(payload);
    }, wait);
  };

  const doSignKudos = async () => {
    step = step + 1;
    const startTs = Date.now();
    await noop();
    const wallet = $walletStore?.keys?.kudos;
    // for each distListItem, sign with our private key
    const signed = await Promise.all(
      kudos.map(async (item) => {
        const { signature, message, signer, payload } = await signKudos(
          item,
          wallet
        );
        await noop();
        return {
          signature,
          message,
          signer,
          //          payload,
        };
      })
    );
    console.log({ signed });
    const endTs = Date.now();
    // wait a bit to show the spinner if we haven't waited so far
    const wait = Math.max(0, 750 - (endTs - startTs));
    setTimeout(async () => {
      step = step + 1;
      await doPackageKudos(signed);
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
                Confirm Account
              </h2>
              <p class="mt-4 text-lg leading-6 text-gray-300">
                We'll sign these kudos with your keys, so verify that you're
                using the desired account.
              </p>
            </div>
          </div>
        {:else if step === 2}
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
        {:else if step === 3}
          <div class="mx-auto lg:mx-0">
            <div class="flex flex-row justify-between">
              <h2 class="text-5xl font-bold tracking-tight text-white">
                Creating Kudos Package...
              </h2>
              <Icon
                name="globe-alt"
                class="h-12 w-12 animate-spin text-cyan-100"
              />
            </div>
          </div>
        {:else if step === 4}
          <div class="mx-auto lg:mx-0">
            <div class="flex flex-row justify-between">
              <h2 class="text-5xl font-bold tracking-tight text-white">
                Publishing Kudos...
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
            class="mt-8 flex flex-row items-center justify-between rounded-xl bg-cyan-50 p-3"
          >
            <input
              type="checkbox"
              class="h-7 w-7 rounded-full border border-cyan-500 text-cyan-700 ring-0 focus:ring-0"
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
                  step = step + 1;
                } else {
                  shake = true;
                  setTimeout(() => {
                    shake = false;
                  }, 500);
                }
              }}
              type="button"
              class={`cursor-pointer rounded-full border border-cyan-600 bg-cyan-200 py-2 px-4 text-sm font-medium text-cyan-900 shadow-sm transition delay-150 ease-in-out hover:bg-gray-200 focus:outline-none focus:ring-0 focus:ring-gray-500 focus:ring-offset-0`}
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
        {:else if step === 1}
          <div
            class="mt-8 flex flex-row items-center justify-between rounded-xl bg-cyan-50 p-3"
          >
            <div
              class="mx-4 flex max-w-2xl flex-row items-center justify-center text-cyan-900"
            >
              <KeyIcon
                type="kudos"
                diameter={48}
                address={$walletStore.keys?.kudos?.address}
              />
              <div class="ml-4">
                <div class="text-lg font-bold text-black">
                  {$walletStore.keys?.kudos?.address}
                </div>
              </div>
            </div>
            <button
              on:click={() => {
                doSignKudos();
              }}
              type="button"
              class={`cursor-pointer rounded-full border border-cyan-600 bg-cyan-200 py-2 px-4 text-sm font-medium text-cyan-900 shadow-sm transition delay-150 ease-in-out hover:bg-gray-200 focus:outline-none focus:ring-0 focus:ring-gray-500 focus:ring-offset-0`}
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
      class={`${buttonClass} border-0 bg-cyan-200 hover:bg-gray-200`}
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
    {#each [0, 1, 2, 3, 4] as modalStep}
      <div
        class:text-gray-300={step < modalStep}
        class:text-cyan-100={step >= modalStep}
      >
        <button
          on:click={() => {
            // not needed
            // if (modalStep < step) {
            //   step = modalStep;
            // }
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
