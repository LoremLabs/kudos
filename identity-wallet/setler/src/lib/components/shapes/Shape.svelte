<script lang="ts">
  import { shapes } from './ShapePatterns.svelte';
  import type { Shape } from './ShapePatterns.svelte';

  export let shape: Shape;
  export let style = '';
  export { klass as class };
  let klass = 'w-40 bg-pink-200';

  function aspectRatio(shape: Shape) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { width, height } = shapes[shape];
    return [width, height].join(' / ');
  }
  // TODO: add a polyfill for aspect-ratio
  $: ap = aspectRatio(shape);
</script>

<div
  style="clip-path: url(#{shape}); aspect-ratio: {ap}; {style}"
  class={klass}
>
  <slot />
</div>
