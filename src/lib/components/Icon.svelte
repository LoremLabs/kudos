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
    | 'chevron-down'
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
    | 'exclamation-triangle'
    | 'eye'
    | 'globe-alt'
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
    | 'paper-airplane'
    | 'paper-clip'
    | 'pencil'
    | 'pencil-alt'
    | 'phone'
    | 'photograph'
    | 'play'
    | 'plus'
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
    | 'solid/cog-6-tooth'
    | 'solid/external-link'
    | 'solid/eye'
    | 'solid/eye-slash'
    | 'solid/fire'
    | 'solid/heart'
    | 'solid/identification'
    | 'solid/information-circle'
    | 'solid/list-bullet'
    | 'solid/lock'
    | 'solid/mail'
    | 'solid/minus-sm'
    | 'solid/plus-sm'
    | 'solid/selector'
    | 'solid/table-cells'
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
    | 'brand/webmon'
    | 'brand/ripple'
    | 'brand/xrpl';

  export type MiscIcons =
    | 'misc/arrows-right-left'
    | 'misc/spinner'
    | 'misc/spinner-2'
    | 'misc/share-arrow'
    | 'misc/play-button'
    | 'misc/pause-button'
    | 'mini/queue-list';

  export type MiniIcons =
    | 'mini/banknotes'
    | 'mini/chevron-right'
    | 'mini/ellipsis-vertical'
    | 'mini/exclamation-triangle'
    | 'mini/no-symbol'
    | 'mini/play'
    | 'mini/plus'
    | 'mini/scale'
    | 'mini/trash'
    | 'mini/x-circle';

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
