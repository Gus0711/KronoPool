import { writable } from 'svelte/store';

/** File de toasts (succès teal / erreur rouge), auto-dismiss ~3s (handoff). */
export type ToastKind = 'success' | 'error';
export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
}

function createToasts() {
	const { subscribe, update } = writable<Toast[]>([]);
	let seq = 0;

	function dismiss(id: number): void {
		update((list) => list.filter((t) => t.id !== id));
	}

	function push(message: string, kind: ToastKind): void {
		const id = ++seq;
		update((list) => [...list, { id, kind, message }]);
		if (typeof window !== 'undefined') {
			setTimeout(() => dismiss(id), 3000);
		}
	}

	return {
		subscribe,
		success: (message: string) => push(message, 'success'),
		error: (message: string) => push(message, 'error'),
		dismiss
	};
}

export const toasts = createToasts();
