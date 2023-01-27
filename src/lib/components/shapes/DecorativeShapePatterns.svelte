<!-- This should be added only once on a page. So, call it only in some top-level +layout.svelte -->
<script context="module" lang="ts">
  export const shapes = {
    decorative_wave: {
      width: 506,
      height: 122,
    },
    decorative_collage_1: {
      width: 191,
      height: 194,
    },
    decorative_collage_2: {
      width: 300,
      height: 299,
    },
  };

  export type DecorativeShape = keyof typeof shapes;
</script>

<svg class="w-0 h-0" tabindex="-1" aria-hidden="true">
  <defs>
    <clipPath
      id="decorative_wave"
      transform="scale({1 / shapes.decorative_wave.width}, {1 /
        shapes.decorative_wave.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M408.716 32.3978C441.382 32.3978 472.233 70.871 505.988 70.871C471.145 70.871 443.197 104.989 408.716 104.989C374.236 104.989 352.458 73.0487 326.689 73.0487C300.919 73.0487 281.319 121.322 240.668 121.322C205.825 121.322 182.233 70.871 155.737 70.871C129.241 70.871 99.842 101.359 71.5315 101.359C34.1472 101.359 25.4363 62.886 0.392451 62.886C25.4363 62.886 36.6879 22.235 71.5316 22.235C106.375 22.235 128.878 62.886 155.737 62.886C182.596 62.886 193.484 0.0948213 240.668 0.0948254C287.853 0.0948296 296.926 62.886 326.689 62.886C356.451 62.886 373.873 32.3978 408.716 32.3978Z"
      />
    </clipPath>

    <clipPath
      id="decorative_collage_1"
      transform="scale({1 / shapes.decorative_collage_1.width}, {1 /
        shapes.decorative_collage_1.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M168.327 100.072L103.405 14.8348L137.354 1.89015L186.507 95.1183L168.327 100.072ZM69.6588 51.5016L168.894 132.216L143.785 141.851L40.9342 86.2493L69.6588 51.5016ZM26.9087 112.842L123.776 160.345L104.566 175.08L5.63842 152.946L26.9087 112.842Z"
      />
    </clipPath>
    <clipPath
      id="decorative_collage_2"
      transform="scale({1 / shapes.decorative_collage_2.width}, {1 /
        shapes.decorative_collage_2.height})"
      clipPathUnits="objectBoundingBox"
    >
      <path
        d="M262.652 180.769L130.427 264.808L131.674 234.703L239.679 135.789L262.652 180.769ZM211.129 94.1568L131.201 183.746L128.739 144.255L186.575 40.6129L211.129 94.1568ZM93.3532 183.048L125.862 29.7859L77.6559 14.7162L72.7227 161.088L93.3532 183.048Z"
      />
    </clipPath>
  </defs>
</svg>
