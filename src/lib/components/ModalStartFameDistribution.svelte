<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Form from '$lib/components/Form.svelte';
  import {
    buttonClass,
    buttonInactiveClass,
    buttonColorClass,
  } from '$lib/tokens';
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
  export let agree = false;

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
  class="max-w-7xl rounded-2xl bg-cyan-900 pl-4 pt-5 pr-8 pb-16 shadow-xl sm:p-6"
>
  <div class="mt-0 ml-4 pt-0 text-left">
    <slot name="header" />
    <div class="mb-6 rounded-2xl bg-cyan-700 py-6">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl lg:mx-0">
          <h2 class="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Give Public Thanks
          </h2>
          <p class="mt-4 text-lg leading-6 text-gray-300">
            This is a great way to recognize those whose work you depend upon.
            We'll cryptographically sign your kudos and <b>publish them</b> to the
            global leader board for all to see.
          </p>
        </div>
        <div
          class="mt-8 flex flex-row items-center justify-between rounded-2xl bg-cyan-600 p-3"
        >
          <input
            type="checkbox"
            class="h-7 w-7 rounded-full border-0 text-cyan-700 ring-0 focus:ring-0"
            value="true"
            bind:checked={agree}
          />
          <div class="mx-4 max-w-2xl italic text-cyan-900">
            I understand that this is a public action and that my kudos will be
            published with my signature to the global leader board.
          </div>
          <button
            on:click={() => {
              if (agree) {
                // next step handleConfirm();
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
                <span aria-label={'processing'} class="ml-2 mr-3 animate-spin">
                  <Icon name="misc/spinner" class="h-5 w-5 text-slate-500" />
                </span>
              {:else}
                <Icon name="chevron-right" class="h-5 w-5 text-cyan-600" />
              {/if}
            </div>
          </button>
        </div>
      </div>
    </div>
    <nav aria-label="Progress">
      <ol role="list" class="overflow-hidden">
        <li class="relative pb-10">
          <div
            class="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-cyan-600"
            aria-hidden="true"
          />
          <!-- Complete Step -->
          <a href="#" class="group relative flex items-center">
            <span class="flex h-9 items-center">
              <span
                class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 group-hover:bg-cyan-800"
              >
                <svg
                  class="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-md font-medium text-cyan-50"
                >Confirm Publishing Plan</span
              >
            </span>
          </a>
        </li>

        <li class="relative pb-10">
          <div
            class="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
            aria-hidden="true"
          />
          <!-- Current Step -->
          <a
            href="#"
            class="group relative flex items-start"
            aria-current="step"
          >
            <span class="flex h-9 items-center" aria-hidden="true">
              <span
                class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-600 bg-white"
              >
                <span class="h-2.5 w-2.5 rounded-full bg-cyan-600" />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-cyan-600"
                >Profile information</span
              >
              <span class="text-sm text-gray-500"
                >Cursus semper viverra facilisis et et some more.</span
              >
            </span>
          </a>
        </li>

        <li class="relative pb-10">
          <div
            class="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
            aria-hidden="true"
          />
          <!-- Upcoming Step -->
          <a href="#" class="group relative flex items-start">
            <span class="flex h-9 items-center" aria-hidden="true">
              <span
                class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300"
                />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-gray-500"
                >Business information</span
              >
              <span class="text-sm text-gray-500">Penatibus eu quis ante.</span>
            </span>
          </a>
        </li>

        <li class="relative pb-10">
          <div
            class="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
            aria-hidden="true"
          />
          <!-- Upcoming Step -->
          <a href="#" class="group relative flex items-start">
            <span class="flex h-9 items-center" aria-hidden="true">
              <span
                class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300"
                />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-gray-500">Theme</span>
              <span class="text-sm text-gray-500"
                >Faucibus nec enim leo et.</span
              >
            </span>
          </a>
        </li>

        <li class="relative">
          <!-- Upcoming Step -->
          <a href="#" class="group relative flex items-start">
            <span class="flex h-9 items-center" aria-hidden="true">
              <span
                class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300"
                />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-gray-500">Preview</span>
              <span class="text-sm text-gray-500"
                >Iusto et officia maiores porro ad non quas.</span
              >
            </span>
          </a>
        </li>
      </ol>
    </nav>
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
</Modal>
