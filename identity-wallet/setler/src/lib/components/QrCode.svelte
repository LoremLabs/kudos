<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import QrCode from 'qrious';
  import { timedToggle } from '$lib/stores/toggle';
  import { addToast } from '$lib/stores/toasts';
  import { writeText } from '@tauri-apps/api/clipboard';

  export let value: string;
  /** Extra text to add to base of QR code when copying */
  export let additionalText = '';
  export let textBeforeCopy = 'Copy QR Code';
  export let textAfterCopy = 'Copied QR Code';
  export let errorCorrection = 'L';
  export let background = '#fff';
  export let color = '#000';

  const size = 800;
  const dispatch = createEventDispatcher();

  const copied = timedToggle(false, true, 1000);
  let canvasElem: HTMLCanvasElement;
  function generateQrCode() {
    new QrCode({
      element: canvasElem,
      background,
      foreground: color,
      level: errorCorrection,
      padding: 0,
      size,
      value,
    });
  }

  export function copy() {
    dispatch('copy', { value }); // return the raw value if needed

    // if (!additionalText) {
    //   canvasElem.toBlob(copyBlob, 'image/png', 1);
    //   return;
    // }

    const canvas = document.createElement('canvas');
    canvas.width = canvasElem.width;
    canvas.height = canvasElem.height + 30;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);

    ctx.drawImage(canvasElem, 0, 0, canvasElem.width, canvasElem.width);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px monospace';
    const { width } = ctx.measureText(additionalText);
    ctx.fillText(
      additionalText,
      Math.floor((canvasElem.width - width) / 2),
      canvasElem.height + 15
    );

    canvas.toBlob(copyBlob, 'image/png', 1);
  }

  function copyBlob(blob: Blob | null) {
    if (!blob) return;

    writeText(value) // not the blob :(
      .then(() => {
        addToast({
          msg: 'Copied QR code',
          type: 'success',
          duration: 3000,
        });
      })
      .catch((err) => {
        addToast({
          msg: 'Failed to copy QR code: ' + err.message,
          type: 'error',
          duration: 3000,
        });
      });

    // this doesn't quite work, although does create the string
    // // convert to base64 url string
    // const reader = new FileReader();
    // reader.readAsDataURL(blob);
    // reader.onloadend = () => {
    //   const base64data = reader.result;
    //   writeText(base64data as string)
    //     .then(() => {
    //       addToast({
    //         msg: 'Copied QR code',
    //         type: 'success',
    //         duration: 3000,
    //       });
    //     })
    //     .catch(
    //       (err) => {
    //         addToast({
    //           msg: 'Failed to copy QR code: ' + err.message,
    //           type: 'error',
    //           duration: 3000,
    //         });
    //       }
    //     );
    // };

    // navigator.clipboard
    //   .write([new ClipboardItem({ [blob.type]: blob })])
    //   .then(() => {
    //     addToast({
    //       msg: 'Copied QR code',
    //       type: 'success',
    //       duration: 3000,
    //     });
    //   })
    //   .catch(
    //     (err) => {
    //       addToast({
    //         msg: 'Failed to copy QR code: ' + err.message,
    //         type: 'error',
    //         duration: 3000,
    //       });
    //     }
    //   );
  }

  onMount(async () => {
    if (!browser) {
      return;
    }
    generateQrCode();
  });

  // if value changes, regenerate the QR code
  $: if (value || additionalText) {
    generateQrCode();
  }
</script>

<div
  class="grid cursor-pointer grid-cols-1 grid-rows-1 items-center justify-center"
>
  <button type="button" class="h-full" style:grid-area="1/-1" on:click={copy}>
    <canvas class="w-full" style:grid-area="1/-1" bind:this={canvasElem} />
    {#if $copied}
      <span class="bf-variant-500 inline-block p-1 text-xs"
        >{textAfterCopy}</span
      >
    {:else}
      <span class="text-transparent">{textBeforeCopy}</span>
    {/if}
    <div class="font-slate-800 -mt-4 text-xs">{additionalText}</div>
  </button>
</div>
