import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import {
	createSession,
	invalidateUserSessions,
	setSessionCookie
} from '$lib/server/auth/session';
import { homePathFor } from '$lib/server/auth/guards';
import { checkRateLimit, resetRateLimit } from '$lib/server/auth/rate-limit';
import type { Actions } from './$types';

const schema = z.object({
	email: z.string().trim().min(1, 'Email requis').email('Email invalide').toLowerCase(),
	password: z.string().min(1, 'Mot de passe requis')
});

export const actions: Actions = {
	default: async (event) => {
		const { request, getClientAddress } = event;
		const key = getClientAddress();
		const limit = checkRateLimit(key);
		if (!limit.allowed) {
			return fail(429, {
				error: `Trop de tentatives. Réessayez dans ${limit.retryAfter} s.`
			});
		}

		const form = await request.formData();
		const parsed = schema.safeParse({
			email: form.get('email'),
			password: form.get('password')
		});
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Champs invalides',
				email: String(form.get('email') ?? '')
			});
		}

		const { email, password } = parsed.data;
		const found = await db.select().from(user).where(eq(user.email, email)).get();

		// Message générique (ne pas révéler l'existence du compte).
		const invalid = () => fail(400, { error: 'Identifiants incorrects.', email });

		if (!found) return invalid();

		// Compte désactivé : connexion refusée + sessions invalidées (CDC §8).
		if (!found.actif) {
			await invalidateUserSessions(found.id);
			return fail(403, { error: 'Ce compte est désactivé. Contactez le directeur.', email });
		}

		const ok = await verifyPassword(found.passwordHash, password);
		if (!ok) return invalid();

		resetRateLimit(key);
		const { token, expiresAt } = await createSession(found.id);
		setSessionCookie(event, token, expiresAt);

		if (found.mustChangePassword) throw redirect(303, '/changer-mot-de-passe');
		throw redirect(303, homePathFor({ ...found }));
	}
};
