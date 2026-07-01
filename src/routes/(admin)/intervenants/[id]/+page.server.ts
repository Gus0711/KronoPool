import { error, fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth/guards';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import {
	definirActif,
	getIntervenant,
	modifierIntervenant,
	reinitialiserMotDePasse
} from '$lib/server/services/intervenants';
import { intervenantSchema, motDePasse } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const intervenant = await getIntervenant(params.id);
	if (!intervenant) throw error(404, 'Intervenant introuvable');
	return { intervenant };
};

export const actions: Actions = {
	modifier: async ({ request, locals, params }) => {
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
			return fail(400, { action: 'modifier', error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}

		const dupe = await db
			.select({ id: user.id })
			.from(user)
			.where(and(eq(user.email, parsed.data.email), ne(user.id, params.id)))
			.get();
		if (dupe) return fail(400, { action: 'modifier', error: 'Cet email est déjà utilisé.' });

		await modifierIntervenant(params.id, parsed.data);
		return { action: 'modifier', ok: true };
	},

	actif: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const actif = form.get('actif') === 'true';
		await definirActif(params.id, actif);
		return { action: 'actif', actif };
	},

	reset: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const mdp = motDePasse.safeParse(form.get('motDePasse'));
		if (!mdp.success) {
			return fail(400, { action: 'reset', error: mdp.error.issues[0]?.message ?? 'Mot de passe invalide' });
		}
		await reinitialiserMotDePasse(params.id, mdp.data);
		return { action: 'reset', ok: true };
	}
};
