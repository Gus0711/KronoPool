import { error, redirect, type Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	clearSessionCookie
} from '$lib/server/auth/session';
import { homePathFor } from '$lib/server/auth/guards';

/**
 * Résolution de session + **guards de rôle côté serveur** (CDC §8).
 *
 * Toutes les routes hors `/login` exigent une session valide. Les groupes de
 * routes `(admin)` / `(intervenant)` n'apparaissent pas dans l'URL ; on garde
 * donc par **préfixe de chemin**. Ce filtre couvre navigations ET form actions
 * (POST) ; les `load`/`actions` re-vérifient en défense en profondeur.
 */

const FORCE_CHANGE_PATH = '/changer-mot-de-passe';
const LOGOUT_PATH = '/deconnexion';

// Routes réservées à l'admin.
const ADMIN_PREFIXES = [
	'/dashboard',
	'/besoins',
	'/intervenants',
	'/recap',
	'/planning',
	'/documents-types'
];
// Routes réservées à l'intervenant.
const INTERVENANT_PREFIXES = ['/creneaux', '/mes-reservations', '/mon-recap'];

function isPublic(path: string): boolean {
	return path === '/login';
}

function matches(path: string, prefixes: string[]): boolean {
	return prefixes.some((p) => path === p || path.startsWith(p + '/'));
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.user = null;
	event.locals.sessionToken = null;

	if (token) {
		const valid = await validateSessionToken(token);
		if (valid) {
			event.locals.user = valid.user;
			event.locals.sessionToken = token;
			// Prolonge le cookie (expiration glissante).
			setSessionCookie(event, token, valid.expiresAt);
		} else {
			clearSessionCookie(event);
		}
	}

	const { user } = event.locals;
	const path = event.url.pathname;

	// --- Non authentifié -------------------------------------------------
	if (!user) {
		if (isPublic(path)) return resolve(event);
		throw redirect(303, '/login');
	}

	// --- Authentifié -----------------------------------------------------
	// Sur /login → renvoyer vers l'espace du rôle.
	if (isPublic(path)) throw redirect(303, homePathFor(user));

	// Changement de mot de passe forcé : bloquant sauf l'écran dédié + déconnexion.
	if (user.mustChangePassword && path !== FORCE_CHANGE_PATH && path !== LOGOUT_PATH) {
		throw redirect(303, FORCE_CHANGE_PATH);
	}

	// Racine → accueil du rôle.
	if (path === '/') throw redirect(303, homePathFor(user));

	// Guards de rôle (vérification serveur, jamais seulement UI).
	if (matches(path, ADMIN_PREFIXES) && user.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs.');
	}
	if (matches(path, INTERVENANT_PREFIXES) && user.role !== 'intervenant') {
		throw error(403, 'Accès réservé aux intervenants.');
	}

	return resolve(event);
};
