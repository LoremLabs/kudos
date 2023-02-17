import { shortId } from '$lib/utils/short-id';
import { writable } from 'svelte/store';

type Toast = {
  msg: string;
  id?: string;
  type: 'success' | 'error' | 'info';
};

export const toasts = writable<Toast[]>([]);

export function addToast(toast: Toast) {
  toast.id = shortId();
  toasts.update((state) => [toast, ...state]);
  setTimeout(removeToast, 3000);
}

function removeToast() {
  toasts.update((state) => {
    return [...state.slice(0, state.length - 1)];
  });
}
