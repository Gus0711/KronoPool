import type { Action } from 'svelte/action';

/**
 * Action « ondulation eau » : au tap/clic, injecte un cercle qui se propage
 * depuis le point de contact puis se dissout. Purement décoratif.
 *
 * - Respecte `prefers-reduced-motion` (aucun ripple si l'utilisateur le demande).
 * - Force `position: relative` + `overflow: hidden` sur l'hôte pour contenir l'onde.
 * - Se désactive proprement (`use:ripple={false}`) pour les éléments non cliquables.
 */
export const ripple: Action<HTMLElement, boolean | undefined> = (node, enabled = true) => {
	let on = enabled !== false;

	// Confine l'onde à la forme (coins arrondis compris).
	if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
	node.style.overflow = 'hidden';

	const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');

	function spawn(e: PointerEvent) {
		if (!on || reduce?.matches) return;
		const rect = node.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		const span = document.createElement('span');
		span.className = 'ripple-ink';
		span.style.width = span.style.height = `${size}px`;
		span.style.left = `${e.clientX - rect.left - size / 2}px`;
		span.style.top = `${e.clientY - rect.top - size / 2}px`;
		node.appendChild(span);
		span.addEventListener('animationend', () => span.remove());
	}

	node.addEventListener('pointerdown', spawn);

	return {
		update(next) {
			on = next !== false;
		},
		destroy() {
			node.removeEventListener('pointerdown', spawn);
		}
	};
};
