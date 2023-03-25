<script lang="ts">
  import Shape from './Shape.svelte';
  import type { Shape as ShapeT } from './ShapePatterns.svelte';

  export let shape: ShapeT;
  export { klass as class };
  let klass = 'bg-pink-400 w-40';
</script>

<div class="grid">
  <div style="grid-area: 1/-1;" class="z-10">
    <slot name="outside" />
  </div>
  <div style="grid-area: 1/-1;">
    <Shape {shape} class={klass}>
      <slot name="inside" />
    </Shape>
  </div>
</div>
