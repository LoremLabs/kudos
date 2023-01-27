<!-- This should be added only once on a page. So, call it only in some top-level __layout.svelte -->
<script context="module" lang="ts">
  export const shapes = {
    shape1: {
      width: 569,
      height: 468,
    },
    shape2: {
      width: 520,
      height: 452,
    },
    shape3: {
      width: 587,
      height: 446,
    },
  };

  export type Shape = keyof typeof shapes;
</script>

<svg class="h-0 w-0" tabindex="-1" aria-hidden="true">
  <defs>
    <clipPath
      id="shape1"
      transform="scale({1 / shapes.shape1.width}, {1 / shapes.shape1.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M0 136.399V462.023C0 465.267 2.70281 467.859 5.94489 467.723L563.256 444.297C566.567 444.158 569.063 441.237 568.684 437.945L518.952 5.50084C518.557 2.06353 515.218 -0.233539 511.866 0.626435L4.28722 130.873C1.76419 131.52 0 133.794 0 136.399Z"
      />
    </clipPath>

    <clipPath
      id="shape2"
      transform="scale({1 / shapes.shape2.width}, {1 / shapes.shape2.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M455.908 451.5H34.3117C31.8023 451.5 29.6817 449.64 29.3544 447.152L0.258967 225.969C0.09264 224.704 0.415756 223.424 1.1622 222.39L114.424 65.4905C115.119 64.5283 116.133 63.8445 117.285 63.5614L372.63 0.827882C374.657 0.330032 376.779 1.14295 377.955 2.8671L518.24 208.652C519.042 209.828 519.305 211.289 518.963 212.671L460.762 447.702C460.209 449.933 458.207 451.5 455.908 451.5Z"
      />
    </clipPath>

    <clipPath
      id="shape3"
      transform="scale({1 / shapes.shape3.width}, {1 / shapes.shape3.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M5.57703 445.282L581.276 422.705C584.123 422.593 586.301 420.129 586.062 417.29L551.434 5.16916C551.197 2.34561 548.663 0.28323 545.85 0.624111L31.0952 63.0038C28.7174 63.2919 26.878 65.2258 26.7091 67.6149L0.393494 439.933C0.183533 442.904 2.60101 445.398 5.57703 445.282Z"
      />
    </clipPath>
  </defs>
</svg>
