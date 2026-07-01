import { error, redirect } from '@sveltejs/kit';
import type { SessionUser } from './session';

/**
 * Guards de rôle **côté serveur** (CDC §8). À appeler dans les `load` / `actions`
 * en plus du filtrage par `hooks.server.ts`. Un intervenant ne doit atteindre
 * aucune route ni action admin.
 */

/** Exige une session valide. Redirige vers `/login` sinon. */
export function requireUser(user: SessionUser | null): SessionUser {
	if (!user) throw redirect(303, '/login');
	return user;
}

/** Exige un admin. 403 si connecté sans le rôle, `/login` si non connecté. */
export function requireAdmin(user: SessionUser | null): SessionUser {
	const u = requireUser(user);
	if (u.role !== 'admin') throw error(403, 'Accès réservé aux administrateurs.');
	return u;
}

/** Exige un intervenant. */
export function requireIntervenant(user: SessionUser | null): SessionUser {
	const u = requireUser(user);
	if (u.role !== 'intervenant') throw error(403, 'Accès réservé aux intervenants.');
	return u;
}

/** Chemin d'accueil selon le rôle (post-login / redirections). */
export function homePathFor(user: SessionUser): string {
	return user.role === 'admin' ? '/dashboard' : '/creneaux';
}
