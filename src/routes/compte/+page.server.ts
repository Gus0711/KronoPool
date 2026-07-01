import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from '$lib/server/auth/password';
import { requireUser } from '$lib/server/auth/guards';
import { statutValidite } from '$lib/server/services/diplomes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const u = requireUser(locals.user);
	const full = await db.select().from(user).where(eq(user.id, u.id)).get();
	if (!full) throw fail(404);

	return {
		infos: {
			nom: full.nom,
			prenom: full.prenom,
			email: full.email,
			telephone: full.telephone,
			niveau: full.niveau,
			role: full.role
		},
		validites: {
			titre: { date: full.dateValiditeTitre, ...statutValidite(full.dateValiditeTitre) },
			pse: { date: full.dateValiditePse, ...statutValidite(full.dateValiditePse) }
		}
	};
};

const schema = z
	.object({
		current: z.string().min(1, 'Mot de passe actuel requis'),
		password: z.string().min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`),
		confirm: z.string()
	})
	.refine((d) => d.password === d.confirm, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirm']
	});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		const form = await request.formData();
		const parsed = schema.safeParse({
			current: form.get('current'),
			password: form.get('password'),
			confirm: form.get('confirm')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}

		const full = await db.select().from(user).where(eq(user.id, u.id)).get();
		if (!full) return fail(404, { error: 'Compte introuvable.' });

		const ok = await verifyPassword(full.passwordHash, parsed.data.current);
		if (!ok) return fail(400, { error: 'Mot de passe actuel incorrect.' });

		const passwordHash = await hashPassword(parsed.data.password);
		await db
			.update(user)
			.set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
			.where(eq(user.id, u.id));

		return { success: true };
	}
};
