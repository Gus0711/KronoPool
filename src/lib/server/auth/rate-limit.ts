/**
 * Rate-limiting simple en mémoire pour `/login` (CDC §8).
 * Fenêtre glissante par clé (IP). Suffisant pour un déploiement mono-instance ;
 * à remplacer par un store partagé si l'app scale horizontalement.
 */

interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 10;

/**
 * Enregistre une tentative pour la clé et indique si elle est autorisée.
 * @returns `{ allowed, retryAfter }` — `retryAfter` en secondes si bloqué.
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return { allowed: true, retryAfter: 0 };
	}

	bucket.count += 1;
	if (bucket.count > MAX_ATTEMPTS) {
		return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
	}
	return { allowed: true, retryAfter: 0 };
}

/** Réinitialise le compteur (ex : après une connexion réussie). */
export function resetRateLimit(key: string): void {
	buckets.delete(key);
}
