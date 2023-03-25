<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { TABS } from './Tabs.svelte';
  import type { Orientation, TabsContext } from './utils';

  const { focusPanel, selectTab, selectedTab, tabs } =
    getContext<TabsContext>(TABS);

  export let onTabChange = (_index) => {};
  export let label: string;
  export let orientation: Orientation = 'horizontal';
  export { klass as class };
  let klass = '';

  onMount(() => {
    selectedTab.subscribe((tab) => {
      // console.log('tab', tab);
      const idx = tabs.indexOf(tab);
      if (idx !== lastTabIndex) {
        onTabChange(idx);
      }
      lastTabIndex = idx;
    });
  });

  function onKeydown(ev: KeyboardEvent) {
    const dir = getKeyAction(ev.key);
    if (dir === null) return;

    const activeTab = $selectedTab;
    if (!activeTab) return;
    const activeIdx = tabs.indexOf(activeTab);
    if (activeIdx === -1) return;

    ev.preventDefault();
    if (dir !== 0) {
      switchTab(activeIdx + dir);
    } else {
      focusPanel();
    }
  }

  function getKeyAction(key: KeyboardEvent['key']) {
    if (orientation === 'horizontal') {
      return { ArrowLeft: -1, ArrowRight: 1, ArrowDown: 0 }[key] ?? null;
    } else {
      return { ArrowUp: -1, ArrowDown: 1, ArrowRight: 0 }[key] ?? null;
    }
  }
  let lastTabIndex = -1;
  function switchTab(idx: number) {
    if (idx < 0) {
      idx = tabs.length - 1;
    } else if (idx === tabs.length) {
      idx = 0;
    }
    selectTab(tabs[idx]);
    if (idx !== lastTabIndex) {
      onTabChange(idx);
    }
    lastTabIndex = idx;
  }
</script>

<div
  role="tablist"
  aria-label={label}
  class={klass || null}
  on:keydown={onKeydown}
>
  <slot />
</div>
