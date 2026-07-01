import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth/guards';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { creerIntervenant, listerIntervenants } from '$lib/server/services/intervenants';
import { intervenantSchema, motDePasse } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { intervenants: await listerIntervenants() };
};

export const actions: Actions = {
	creer: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = intervenantSchema.safeParse({
			nom: form.get('nom'),
			prenom: form.get('prenom'),
			email: form.get('email'),
			telephone: form.get('telephone'),
			niveau: form.get('niveau'),
			dateValiditeTitre: form.get('dateValiditeTitre'),
			dateValiditePse: form.get('dateValiditePse')
		});
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Champs invalides',
				values: Object.fromEntries(form)
			});
		}

		const mdp = motDePasse.safeParse(form.get('motDePasse'));
		if (!mdp.success) {
			return fail(400, {
				error: mdp.error.issues[0]?.message ?? 'Mot de passe invalide',
				values: Object.fromEntries(form)
			});
		}

		// Unicité email.
		const existing = await db.select().from(user).where(eq(user.email, parsed.data.email)).get();
		if (existing) {
			return fail(400, { error: 'Un compte existe déjà avec cet email.', values: Object.fromEntries(form) });
		}

		await creerIntervenant(parsed.data, mdp.data);
		return { ok: true };
	}
};
