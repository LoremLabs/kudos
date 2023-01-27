<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { TABS } from './Tabs.svelte';
  import { toPanelId, toTabId } from './utils';
  import type { Panel, TabsContext } from './utils';

  const { registerPanel, selectedPanel, panels, tabs } =
    getContext<TabsContext>(TABS);

  export let id = '';
  export { klass as class };
  let klass = '';

  let elem: HTMLElement | null = null;
  const panel: Panel = { id, elem };

  registerPanel(panel);

  onMount(() => {
    panel.elem = elem;
  });
</script>

<div
  tabindex="0"
  role="tabpanel"
  bind:this={elem}
  class={klass || null}
  class:hidden={$selectedPanel !== panel}
  id={toPanelId(panel.id || tabs[panels.indexOf(panel)].id)}
  aria-labelledby={toTabId(panel.id || tabs[panels.indexOf(panel)].id)}
>
  <slot />
</div>
