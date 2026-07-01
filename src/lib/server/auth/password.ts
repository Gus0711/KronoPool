import { hash, verify } from '@node-rs/argon2';

/**
 * Hachage de mot de passe **Argon2id** (CDC §8).
 * Paramètres alignés sur les recommandations OWASP (m=19MiB, t=2, p=1).
 * Le mot de passe en clair n'est jamais loggé ni renvoyé.
 */
const OPTS = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
} as const;

export function hashPassword(plain: string): Promise<string> {
	return hash(plain, OPTS);
}

export function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
	return verify(storedHash, plain, OPTS);
}

/** Longueur minimale imposée (CDC §8). */
export const PASSWORD_MIN_LENGTH = 8;
