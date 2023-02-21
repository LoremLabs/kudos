<script>
  import { colorizer, defaultPalette } from '$lib/utils/colorizer';

  export let type = '';
  export let pallette = defaultPalette;
  export let bg = '';
  export let colorize = true;
  export { klass as class };
  let klass = '';
</script>

<span
  title={`${type}`}
  on:click
  class={`flex h-5 cursor-pointer flex-row flex-nowrap items-center justify-center text-ellipsis whitespace-nowrap rounded-full border-2 border-white px-1.5 py-1 text-center font-mono text-xs font-thin lowercase tracking-tighter text-white md:h-6 ${klass}`}
  style={`background-color:${
    colorize ? colorizer(type, pallette) : bg
  }; font-size: 0.6rem;`}
>
  <slot />
</span>
