import slugify from '$lib/utils/slugify';
import type { Writable } from 'svelte/store';

export const toTabId = (id: string) => slugify(`tab-${id}`);
export const toPanelId = (id: string) => slugify(`tabpanel-${id}`);

export type Tab = { id: string; elem: HTMLElement | null };
export type Panel = { id?: string; elem: HTMLElement | null };
export type Orientation = 'horizontal' | 'vertical';

export interface TabsContext {
  tabs: Tab[];
  panels: Panel[];
  registerTab(tab: Tab): void;
  registerPanel(panel: Panel): void;
  selectTab(tab: Tab): void;
  selectedTab: Writable<Tab | null>;
  selectedPanel: Writable<Panel | null>;
  focusPanel(): void;
}
