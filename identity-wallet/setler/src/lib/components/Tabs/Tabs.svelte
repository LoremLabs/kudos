<script lang="ts" context="module">
  export const TABS = {};
</script>

<script lang="ts">
  import { setContext, onDestroy, getContext, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Tab, Panel, TabsContext } from './utils';

  const selectedTab = writable<Tab | null>(null);
  const selectedPanel = writable<Panel | null>(null);
  const tabs: Tab[] = [];
  const panels: Panel[] = [];

  export let active = $selectedTab?.id;
  export { klass as class };
  let klass = '';

  setContext<TabsContext>(TABS, {
    tabs,
    panels,
    selectedTab,
    selectedPanel,
    registerTab(tab) {
      tabs.push(tab);
      selectedTab.update((current) => current || tab);

      onDestroy(() => {
        const i = tabs.indexOf(tab);
        tabs.splice(i, 1);
        selectedTab.update((current) =>
          current === tab ? tabs[i] || tabs[tabs.length - 1] : current
        );
      });
    },
    registerPanel(panel) {
      panels.push(panel);
      selectedPanel.update((current) => current || panel);

      onDestroy(() => {
        const i = panels.indexOf(panel);
        panels.splice(i, 1);
        selectedPanel.update((current) =>
          current === panel ? panels[i] || panels[panels.length - 1] : current
        );
      });
    },
    selectTab(tab) {
      active = tab.id;
      const i = tabs.indexOf(tab);
      if (!panels[i].id) {
        panels[i].id = tab.id;
      }
      selectedTab.set(tab);
      selectedPanel.set(panels[i]);
      if (tab.elem) tab.elem.focus();
    },
    focusPanel() {
      const panel = $selectedPanel;
      if (panel && panel.elem) {
        panel.elem.focus();
      }
    },
  });

  const { selectTab } = getContext<TabsContext>(TABS);
  const setActiveTab = (active: Tab['id']) => {
    const tab = tabs.find((tab) => tab.id === active);
    if (tab) selectTab(tab);
  };

  $: if (active) {
    setActiveTab(active);
  }

  onMount(() => {
    if (active) setActiveTab(active);
  });
</script>

<div class={klass || null}>
  <slot />
</div>
