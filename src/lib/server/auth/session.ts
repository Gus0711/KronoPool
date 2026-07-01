import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '../db';
import { session, user, type Role, type Niveau } from '../db/schema';

/**
 * Sessions maison (CDC §8) :
 * - token aléatoire (256 bits) envoyé au client dans un cookie ;
 * - stocké **hashé** (SHA-256) en base → le vol de la base ne donne pas les tokens ;
 * - **expiration glissante** : prolongée si l'on approche de l'échéance ;
 * - cookie `httpOnly / Secure / SameSite=Lax`.
 */

export const SESSION_COOKIE = 'kp_session';
const DAY = 1000 * 60 * 60 * 24;
const SESSION_DURATION = 30 * DAY;
const RENEW_THRESHOLD = 15 * DAY;

/** Utilisateur résolu attaché à `event.locals`. Ne contient jamais le hash. */
export interface SessionUser {
	id: string;
	role: Role;
	nom: string;
	prenom: string;
	email: string;
	niveau: Niveau | null;
	mustChangePassword: boolean;
	actif: boolean;
}

function toSessionUser(u: typeof user.$inferSelect): SessionUser {
	return {
		id: u.id,
		role: u.role,
		nom: u.nom,
		prenom: u.prenom,
		email: u.email,
		niveau: u.niveau,
		mustChangePassword: u.mustChangePassword,
		actif: u.actif
	};
}

/** Génère un token de session brut (à envoyer au client, jamais stocké tel quel). */
export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	// base64url sans padding.
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

async function hashToken(token: string): Promise<string> {
	const data = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Crée une session pour l'utilisateur et renvoie le token brut + son échéance. */
export async function createSession(
	userId: string
): Promise<{ token: string; expiresAt: Date }> {
	const token = generateSessionToken();
	const id = await hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION);
	await db.insert(session).values({ id, userId, expiresAt });
	return { token, expiresAt };
}

/**
 * Valide un token : renvoie l'utilisateur et l'échéance courante, ou `null`.
 * Applique l'expiration glissante et invalide la session d'un compte désactivé.
 */
export async function validateSessionToken(
	token: string
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
	const id = await hashToken(token);
	const row = await db
		.select({ session, user })
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, id))
		.get();

	if (!row) return null;

	// Expirée → purge.
	if (Date.now() >= row.session.expiresAt.getTime()) {
		await db.delete(session).where(eq(session.id, id));
		return null;
	}

	// Compte désactivé → sessions invalidées (CDC §8).
	if (!row.user.actif) {
		await db.delete(session).where(eq(session.userId, row.user.id));
		return null;
	}

	// Expiration glissante.
	let expiresAt = row.session.expiresAt;
	if (Date.now() >= expiresAt.getTime() - RENEW_THRESHOLD) {
		expiresAt = new Date(Date.now() + SESSION_DURATION);
		await db.update(session).set({ expiresAt }).where(eq(session.id, id));
	}

	return { user: toSessionUser(row.user), expiresAt };
}

/** Supprime une session à partir de son token brut. */
export async function invalidateSession(token: string): Promise<void> {
	const id = await hashToken(token);
	await db.delete(session).where(eq(session.id, id));
}

/** Supprime **toutes** les sessions d'un utilisateur (désactivation, reset MDP). */
export async function invalidateUserSessions(userId: string): Promise<void> {
	await db.delete(session).where(eq(session.userId, userId));
}

/** Pose le cookie de session. */
export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		expires: expiresAt
	});
}

/** Supprime le cookie de session. */
export function clearSessionCookie(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}
