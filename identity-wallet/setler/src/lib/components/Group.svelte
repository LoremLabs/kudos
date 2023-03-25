<script>
  export let left = 0;
  export let top = 0;
</script>

<g transform={`translate(${left}, ${top})`}>
  <slot />
</g>
