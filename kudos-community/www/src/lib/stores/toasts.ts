import { shortId } from '$lib/utils/short-id';
import { writable } from 'svelte/store';

type Toast = {
	msg: string;
	id?: string;
	type: 'success' | 'error' | 'info' | 'warn' | 'neutral';
	duration?: number;
};

export const toasts = writable<Toast[]>([]);

export function addToast(toast: Toast) {
	toast.id = shortId();
	toasts.update((state) => [toast, ...state]);
	toast.duration = toast.duration || 30000;
	setTimeout(removeToast, toast.duration);
}

function removeToast() {
	toasts.update((state) => {
		return [...state.slice(0, state.length - 1)];
	});
}
