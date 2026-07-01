import { redirect } from '@sveltejs/kit';
import { invalidateSession, clearSessionCookie } from '$lib/server/auth/session';
import type { PageServerLoad } from './$types';

/** Déconnexion (idempotente) : purge la session courante puis renvoie au login. */
export const load: PageServerLoad = async (event) => {
	if (event.locals.sessionToken) {
		await invalidateSession(event.locals.sessionToken);
	}
	clearSessionCookie(event);
	throw redirect(303, '/login');
};
