<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import focusableSelectors from 'focusable-selectors';
  import { TABS } from './Tabs.svelte';
  import { toPanelId, toTabId } from './utils';
  import type { Tab, TabsContext } from './utils';

  const { registerTab, selectTab, selectedTab } = getContext<TabsContext>(TABS);

  export let id: string;
  export let skip = false;
  export { klass as class };
  let klass = '';

  let elem: HTMLElement | null = null;
  const tab: Tab = { id, elem };

  registerTab(tab);

  $: selected = $selectedTab === tab;

  onMount(() => {
    tab.elem = elem;
  });
  $: elem && setTabindex(elem, selected);

  /**
   * If the [role=tab] element contains any focusable elements, the selected [role=tab] doesn't get focused when tablist
   * is focused. This ensures the children elements for an element with tabindex="-1" aren't focusable.
   */
  function setTabindex(elem: HTMLElement, selected: boolean) {
    elem
      .querySelectorAll(focusableSelectors.join(', '))
      .forEach((el) => el.setAttribute('tabindex', selected ? '0' : '-1'));
  }
</script>

<div
  role="tab"
  bind:this={elem}
  aria-selected={selected}
  aria-controls={toPanelId(tab.id)}
  id={toTabId(tab.id)}
  tabindex={selected ? 0 : -1}
  class={klass || null}
  class:hidden={skip}
  on:click={() => selectTab(tab)}
>
  <slot {selected} {id} />
</div>
