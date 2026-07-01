import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/auth/guards';
import {
	detailBesoin,
	libererPoste,
	modifierBesoin,
	supprimerBesoin
} from '$lib/server/services/besoins';
import { besoinBase } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await detailBesoin(params.id);
	if (!detail) throw error(404, 'Besoin introuvable');
	return { detail };
};

export const actions: Actions = {
	liberer: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = z.object({ posteId: z.string().min(1) }).safeParse({
			posteId: form.get('posteId')
		});
		if (!parsed.success) return fail(400, { action: 'liberer', error: 'Requête invalide.' });

		const ok = await libererPoste(admin.id, parsed.data.posteId);
		return { action: 'liberer', ok };
	},

	modifier: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = besoinBase.safeParse({
			date: form.get('date'),
			heureDebut: form.get('heureDebut'),
			heureFin: form.get('heureFin'),
			commentaire: form.get('commentaire')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'modifier',
				error: parsed.error.issues[0]?.message ?? 'Champs invalides'
			});
		}
		await modifierBesoin(params.id, parsed.data);
		return { action: 'modifier', ok: true };
	},

	supprimer: async ({ locals, params }) => {
		requireAdmin(locals.user);
		await supprimerBesoin(params.id);
		throw redirect(303, '/besoins');
	}
};
