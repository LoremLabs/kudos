<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import jazzicon from '@metamask/jazzicon';

  export let address: string = '0x00';
  export let diameter: number = 30;
  export let style = '';
  export { klass as class };
  let klass = 'w-full h-full';

  onMount(async () => {
    if (!browser) {
      return;
    }
    createIdenticon();
  });

  let identicon: HTMLElement;
  let identiconHtml;

  const isValidAddress = (address: string) => {
    return /^(0x)?[0-9a-f]{40}$/i.test(address);
  };

  const createIdenticon = () => {
    if (isValidAddress(address)) {
      const numericRepresentation = jsNumberForAddress(address);
      identicon = jazzicon(diameter, numericRepresentation);
      identiconHtml = identicon.outerHTML;
    } else {
      identiconHtml =
        '<div class="text-center text-gray-600 w-6 h-6 rounded-full bg-gray-500">&nbsp;</div>';
    }
  };

  // better, but not compatible with metamask icons :(
  // const jsNumberForAddress = (address: string) => {
  //   const addressHex = address.replace('0x', '');
  //   const addressArray = addressHex.match(/.{1,2}/g);
  //   const addressArrayInt = addressArray.map((hex) => parseInt(hex, 16));
  //   return addressArrayInt.reduce((acc, val) => acc + val);
  // };
  const jsNumberForAddress = (address: string) => {
    if (address && address.length) {
      const addr = address.slice(2, 10);
      const seed = parseInt(addr, 16);
      return seed;
    } else {
      return 0;
    }
  };

  $: {
    address && createIdenticon();
  }
</script>

{#if browser}
  <div {style} class={klass}>
    {@html identiconHtml}
  </div>
{/if}
