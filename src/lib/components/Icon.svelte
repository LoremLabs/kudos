<script context="module" lang="ts">
  import iconsSvg from '$lib/static/icons.svg';

  export type RegularIcons =
    | 'arrow-sm-right'
    | 'adjustments'
    | 'at-symbol'
    | 'badge-check'
    | 'bell'
    | 'cash'
    | 'chart-bar'
    | 'chat-alt'
    | 'chat-alt-2'
    | 'check'
    | 'chevron-double-right'
    | 'chevron-right'
    | 'chevron-left'
    | 'clipboard-copy'
    | 'clock'
    | 'cog'
    | 'credit-card'
    | 'cursor-click'
    | 'currency-dollar'
    | 'document'
    | 'download'
    | 'external-link'
    | 'exclaimation'
    | 'exclaimation-circle'
    | 'eye'
    | 'home'
    | 'inbox'
    | 'information-circle'
    | 'key'
    | 'lightning-bolt'
    | 'library'
    | 'link'
    | 'lock-closed'
    | 'logout'
    | 'menu-alt-2'
    | 'microphone'
    | 'paper-clip'
    | 'pencil'
    | 'pencil-alt'
    | 'phone'
    | 'photograph'
    | 'play'
    | 'presentation-chart-line'
    | 'qrcode'
    | 'question-mark-circle'
    | 'receipt-refund'
    | 'refresh'
    | 'search'
    | 'share'
    | 'shopping-cart'
    | 'sparkles'
    | 'support'
    | 'switch-vertical'
    | 'terminal'
    | 'thumb-down'
    | 'thumb-up'
    | 'trash'
    | 'user-circle'
    | 'upload'
    | 'video-camera'
    | 'view-grid'
    | 'view-grid-add'
    | 'x'
    | 'x-circle';

  export type SolidIcons =
    | 'solid/calendar'
    | 'solid/check-circle'
    | 'solid/chevron-down'
    | 'solid/external-link'
    | 'solid/heart'
    | 'solid/information-circle'
    | 'solid/lock'
    | 'solid/mail'
    | 'solid/minus-sm'
    | 'solid/plus-sm'
    | 'solid/selector'
    | 'solid/user-group'
    | 'solid/x-circle'
    | 'solid/x';

  export type BrandIcons =
    | 'brand/facebook'
    | 'brand/google'
    | 'brand/instagram'
    | 'brand/nft'
    | 'brand/notion'
    | 'brand/stripe'
    | 'brand/stripe-square'
    | 'brand/twitter'
    | 'brand/unlock'
    | 'brand/unlock-square'
    | 'brand/webmon';

  export type MiscIcons =
    | 'misc/spinner'
    | 'misc/share-arrow'
    | 'misc/play-button'
    | 'misc/pause-button';

  export type MiniIcons = 'mini/exclamation-triangle';

  /** <symbol> id's from {@linkcode iconsSvg} */
  export type IconName =
    | RegularIcons
    | SolidIcons
    | BrandIcons
    | MiscIcons
    | MiniIcons;
</script>

<script lang="ts">
  export let name: IconName;

  let klass = 'w-4 h-4';
  export let fill: string | undefined = undefined;
  export let stroke: string | undefined = undefined;
  export { klass as class };
</script>

<svg
  aria-hidden="true"
  class="pointer-events-none {klass}"
  fill={fill || (name.startsWith('solid/') ? 'currentColor' : 'none')}
  stroke={stroke || (name.startsWith('solid/') ? undefined : 'currentColor')}
>
  <use xlink:href="{iconsSvg}#{name}" />
</svg>
