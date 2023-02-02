<script lang="ts">
  // import { WebviewWindow } from '@tauri-apps/api/window';
  import { open as openShell } from '@tauri-apps/api/shell';
  import { appLocalDataDir } from '@tauri-apps/api/path';
  import { invoke } from '@tauri-apps/api/tauri';
  import { createOrReadSeed, deriveKeys } from '$lib/utils/keys-manager';
  import Modal from '$lib/components/Modal.svelte';
  import ModalPassPhrase from '$lib/components/ModalPassPhrase.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import Switch from '$lib/components/Switch.svelte';

  import { exists } from '@tauri-apps/api/fs';

  import Icon from '$lib/components/Icon.svelte';
  import { onMount } from 'svelte';
  import { getConfig, setConfig } from '$lib/utils/config';
  import { clearConfigStore } from '$lib/stores/clearConfig';
  import { fade, fly } from 'svelte/transition';

  import { WebviewWindow } from '@tauri-apps/api/window';
  import { appWindow } from '@tauri-apps/api/window';

  const LOGIN_URL = '/app';

  const openMainWindow = async () => {
    const webview = new WebviewWindow('app', {
      url: LOGIN_URL,

      // window features
      title: '',
      resizable: true,
      width: 1024,
      height: 768,
      decorations: true,
      hiddenTitle: true,
      titleBarStyle: 'Overlay',
      center: true,
      acceptFirstMouse: true,
      userAgent: 'setler/desktop',
    });
    webview.once('tauri://created', async () => {
      // webview window successfully created
      await appWindow.close();
    });
    webview.once('tauri://error', function (e) {
      console.log({ e });
      openState = 'error';
    });
  };

  const goto = (/** @type {string} */ url) => {
    openShell(url);
  };

  let openState = 'init';
  let modal = '';
  let mnemonic = '';
  let disabledModalSubmit = false;
  let modalOpen = false;
  let panelOpen = null;
  let passPhrase = '';
  let config = {};
  let startTs = Date.now();
  let walletId = 0;
  let clearConfig = {};
  let processing = 0;
  let ready = false;

  let shouldAskForPassPhrase = false;
  let askForPassPhraseModal = false;

  let askForPassPhrasePromise: Promise<void>;
  const askForPassPhrase = async () => {
    askForPassPhraseModal = true;
    let userData = await askForPassPhrasePromise;
    askForPassPhraseModal = false;
    return userData;
  };

  const readWalletState = async () => {
    if (passPhrase === '' && shouldAskForPassPhrase) {
      const userData = await askForPassPhrase();
      console.log({ userData }, '2');
      // allow empty passPhrase
      if (userData.passPhrase) {
        passPhrase = userData.passPhrase;
        config.passPhrase = passPhrase;
        await setConfig(config);
      }
    }

    const salt: string = await invoke('get_salt');

    try {
      const seed = await createOrReadSeed({ salt, id: walletId, passPhrase });
      mnemonic = seed.mnemonic;
    } catch (e) {
      console.log({ e });
      alert(e.message);
    }
  };

  const onConnectWallet = async () => {
    processing++;
    await onCreateWallet();
    processing--;
  };
  const onCreateWallet = async () => {
    processing++;
    try {
      await readWalletState();
      if (!clearConfig.hasSeenSeed) {
        modal = 'seed';
        modalOpen = true;
        disabledModalSubmit = true;

        setTimeout(() => {
          disabledModalSubmit = false;
        }, 2000);
      } else {
        await openMainWindow();
      }
    } catch (e) {
      console.log({ e });
      alert(e.message);
    } finally {
      processing--;
    }
  };

  onMount(async () => {
    clearConfig = await clearConfigStore.init();
    if (clearConfig && clearConfig.shouldAskForPassPhrase) {
      shouldAskForPassPhrase = true;
    } else {
      shouldAskForPassPhrase = false;
    }

    const checkForSeedFile = async () => {
      // get runtime config
      config = await getConfig();
      passPhrase = config.passPhrase || '';

      const baseDir = await appLocalDataDir();
      const fullPath = `${baseDir}state/setlr-0.seed`;

      try {
        const fileFound = await exists(fullPath);
        console.log({ fileFound });
        if (fileFound) {
          return 'existing';
        } else {
          return 'new';
        }
      } catch (e) {
        console.log('error opening seed', e);
        return 'error';
      }
    };
    openState = await checkForSeedFile();
    await appWindow.center();
    ready = true;
  });
</script>

<div class="overflow-hidden bg-white">
  {#if ready}
    <section aria-labelledby="features-heading" class="relative min-h-screen">
      <div
        class="hidden overflow-hidden pt-2 md:absolute md:block md:h-full md:w-2/5 md:pr-4 xl:pr-16"
      >
        <img
          src="/joao-guimaraes-9b4jtcBEP4A-unsplash.jpg"
          alt=""
          class="h-full w-full border-r-4 border-r-gray-200 object-cover object-center md:h-full md:w-full"
        />
      </div>
      <div class="absolute bottom-10 left-5 hidden opacity-50 md:block">
        <button
          on:click={() => {
            goto(
              'https://unsplash.com/photos/9b4jtcBEP4A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText'
            );
          }}
        >
          <span
            class="inline-flex items-center rounded-full bg-gray-100 py-0.5 pl-2 pr-0.5 text-xs font-medium text-gray-700"
          >
            <!-- TODO: make this kudos work! -->
            kudos: João Guimarães
            <Icon name="external-link" class="mx-2 h-3 w-3" />
          </span>
        </button>
      </div>

      <div
        class="white mx-auto max-w-2xl px-4 sm:px-6 md:grid md:max-w-7xl md:grid-cols-5 md:gap-x-8 md:px-4 md:pt-12"
      >
        <div class="pl-8 pr-12 md:col-span-3 md:col-start-3">
          <h2 id="features-heading" class="font-medium text-gray-500">
            Setler: an <span class="font-medium italic">identity wallet</span> for
            your digital life
          </h2>
          <p class="mt-4 text-4xl font-bold tracking-tight text-gray-900">
            Welcome!
          </p>
          <p class="mt-4 text-gray-700">
            Setler helps you manage your decentralized, self-sovereign identity
            with a suite of communications, payment, and authoring tools powered
            by cryptography.
          </p>

          <dl
            class="mt-10 grid grid-cols-1 gap-y-10 gap-x-8 text-sm sm:grid-cols-1"
          >
            <div>
              <dt class="font-medium text-gray-900">
                Distributed Identifier Registry
              </dt>
              <dd class="mt-2 text-gray-700">
                Use your identity wallet to store Distributed Identifiers (DIDs)
                which enable no one but you to control your identity data.
              </dd>
            </div>

            <div>
              <dt class="font-medium text-gray-900">Kudos Settlement</dt>
              <dd class="mt-2 text-gray-700">
                Manage your digital reputation by sending and settling <button
                  class="underline"
                  on:click={() => {
                    goto('https://www.loremlabs.com/?utm_campaign=setler');
                  }}>kudos</button
                >.
              </dd>
            </div>

            <div>
              <dt class="font-medium text-gray-900">Non-custodial Wallet</dt>
              <dd class="mt-2 text-gray-700">
                Your cryptographic keys enable you to interface with the
                blockchain.
              </dd>
            </div>

            {#if openState === 'existing'}
              <div class="h-24 w-full" in:fade out:fade>
                <button
                  type="button"
                  in:fly={{ y: -20, duration: 1000 }}
                  on:click={onConnectWallet}
                  class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div
                    class="items-justify-between flex w-full flex-row items-center justify-end transition"
                    in:fade
                    out:fade
                  >
                    <span class="mr-6 ">Connect Identity Wallet</span>
                    <span
                      aria-label={'processing'}
                      class="ml-2 mr-3 animate-spin ease-in-out"
                      class:opacity-0={processing <= 0}
                      class:opacity-100={processing > 0}
                    >
                      <Icon name="misc/spinner" class="h-5 w-5 text-gray-50" />
                    </span>
                  </div>
                </button>
              </div>
            {:else if openState === 'new'}
              <div class="-mt-4  h-24 w-full" in:fade out:fade>
                <button
                  in:fly={{ y: -20, duration: 1000 }}
                  type="button"
                  on:click={onCreateWallet}
                  class="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-blue-700 px-6 py-3 text-base font-medium text-white shadow-sm shadow-lg transition delay-150 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div
                    class="items-justify-between flex w-full flex-row items-center justify-end transition"
                    in:fade
                    out:fade
                  >
                    <span class="mr-6 ">Create Identity Wallet</span>
                    <span
                      aria-label={'processing'}
                      class="ml-2 mr-3 animate-spin ease-in-out"
                      class:opacity-0={processing <= 0}
                      class:opacity-100={processing > 0}
                    >
                      <Icon name="misc/spinner" class="h-5 w-5 text-gray-50" />
                    </span>
                  </div>
                </button>
                <span
                  class="m-auto mt-4 inline-flex w-full items-center justify-center text-xs text-gray-500"
                >
                  This creates your keys and stores in your computer's key
                  chain.
                </span>
              </div>
            {:else if Date.now() - startTs > 3000}
              <!-- shouldn't happen? -->
              <div class="w-full" in:fade out:fade>
                <div class="border-l-4 border-red-400 bg-red-50 p-2">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <Icon
                        name="exclaimation-circle"
                        class="h-5 w-5 text-red-700"
                      />
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-700">
                        Error connecting to wallet
                      </h3>
                      <div class="mt-2 text-sm text-red-700">
                        <p>Please try again.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </dl>
        </div>
      </div>
    </section>
  {/if}
</div>
<div class="absolute top-12 right-4 text-gray-500">
  <button
    id="panel-open"
    class="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
    on:click={() => {
      panelOpen = document.getElementById('panel-open');
    }}
  >
    <Icon name="cog" class="mx-2 h-6 w-6" />
  </button>
</div>
<Panel heading="Login Settings" bind:opener={panelOpen} class="bg-slate-200">
  <form
    id="advanced-form"
    class="p-5 py-4 sm:py-5"
    autocomplete="off"
    on:submit|preventDefault={() => {}}
  >
    <div class="mt-2 rounded-md bg-white p-4">
      <div class="w-full">
        <Switch
          bind:value={shouldAskForPassPhrase}
          label="Pass Phrase on Startup"
          description="Prompt for Pass Phrase on Startup?"
          id="passphrase-on-startup"
        />
      </div>
    </div>
    {#if shouldAskForPassPhrase}
      <div class="mt-12 rounded-md bg-white p-4" in:fade out:fade>
        <label class="block text-sm">
          <span class="text-sm font-medium text-gray-900"
            >Mneumonic Pass Phrase
          </span>
          <input
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder=""
            on:keydown={(e) => {
              // keep before bind:value
              if (passPhrase === '') {
                // automatically set this when we transition from '' => something
                shouldAskForPassPhrase = true;
              }
            }}
            bind:value={passPhrase}
            autofocus={true}
            class="mt-1 mb-4 block w-full rounded-sm border-gray-200 outline-none ring-gray-50 invalid:ring-1 invalid:ring-red-500 focus:border-current focus:ring-0 sm:text-sm"
          />
          <div class="flex flex-row text-sm font-medium text-gray-500">
            <div class="ml-4 mr-4">
              <Icon name="information-circle" class="h-4 w-4 text-gray-400" />
            </div>
            Note: this is not the 24 word mneumonic, but a pass phrase used in conjunction
            with the mneumonic to derive your keys, sometimes called the "25th word".
            Use of this is optional and recommended for advanced users only.
          </div>
          <div class="m-auto mt-8 max-w-xl text-sm text-gray-500">
            <div class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <!-- Heroicon name: mini/x-circle -->
                  <svg
                    class="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">
                    If you lose your pass phrase, you will lose access to your
                    wallet which contains your identity and may result in
                    financial loss.
                  </h3>
                  <div class="mt-2 text-sm text-red-700">
                    <ul role="list" class="list-disc space-y-1 pl-5">
                      <li>
                        We do not save your pass phrase so you will need to
                        enter it every time you start this application.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </label>
      </div>
    {/if}
  </form>
  <div slot="footer">
    <button
      on:click={async () => {
        // save config
        console.log('saving config');
        config.passPhrase = passPhrase;
        await setConfig(config);

        clearConfig.shouldAskForPassPhrase = shouldAskForPassPhrase;
        await clearConfigStore.save(clearConfig);

        panelOpen = null;
      }}
      type="submit"
      class="cursor-pointer rounded-full border border-gray-300 bg-blue-700 py-2
  px-4 text-sm font-medium text-white
  shadow-sm transition delay-150 ease-in-out hover:bg-gray-700
  focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      Save
    </button>
  </div>
</Panel>
{#if modal === 'seed'}
  <Modal
    bind:open={modalOpen}
    ariaLabelledBy="modal"
    class="top-8 bg-white pl-4 pt-2 pb-4 pr-8 shadow-xl sm:p-6"
  >
    <div class="bg-white sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <p class="-mt-4 text-4xl font-bold tracking-tight text-gray-900">
          Important!
        </p>
        <h3 class="my-8 text-lg font-medium leading-6 text-gray-900">
          These words are called your recovery phrase. Please write them down on
          paper in the order shown and store them in a safe place. We recommend
          against using an online or cloud-based service to store your recovery
          phrase.
        </h3>
        <div class="m-auto mt-2 max-w-xl text-sm text-gray-500">
          <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <!-- Heroicon name: mini/x-circle -->
                <svg
                  class="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  If you lose your recovery phrase, you will lose access to your
                  wallet which contains your identity and may result in
                  financial loss.
                </h3>
                <div class="mt-2 text-sm text-red-700">
                  <ul role="list" class="list-disc space-y-1 pl-5">
                    <li>It's recommended to use paper.</li>
                    <li>Order matters.</li>
                    <li>
                      If you use a phase phrase you should remember it too.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <dl class="mt-10 grid grid-cols-6 gap-y-10 gap-x-8 text-sm">
          {#each mnemonic.split(' ') as word, i}
            <dd class="inline-flex items-center ">
              <span>
                {i + 1}
              </span>
              <div
                class="m-auto justify-center rounded-full bg-gray-100 px-2 font-mono text-black"
              >
                {word}
              </div>
            </dd>
          {/each}
        </dl>
        <div class="mt-12">
          <button
            on:click={async () => {
              modal = '';
              modalOpen = false;

              // save that we've seen these
              clearConfig.hasSeenSeed = true;
              await clearConfigStore.save(clearConfig);
              await openMainWindow();
            }}
            type="button"
            disabled={disabledModalSubmit}
            class="inline-flex items-center rounded-full border border-white bg-red-800 px-4 py-2 font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-0 focus:ring-offset-2 disabled:bg-red-200 sm:text-sm"
            >I have written these down</button
          >
        </div>
      </div>
    </div>
  </Modal>
{/if}
<ModalPassPhrase
  bind:open={askForPassPhraseModal}
  bind:done={askForPassPhrasePromise}
  handleCancel={() => {
    processing = 0;
  }}
>
  <div slot="header">
    <h3 class="text-lg font-black leading-6 text-gray-900" id="modal-headline">
      &nbsp;
    </h3>
  </div>
</ModalPassPhrase>
