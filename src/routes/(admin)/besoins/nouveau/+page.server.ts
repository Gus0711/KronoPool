import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import { creerBesoin } from '$lib/server/services/besoins';
import { besoinCreate } from '$lib/server/validation';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const admin = requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = besoinCreate.safeParse({
			date: form.get('date'),
			heureDebut: form.get('heureDebut'),
			heureFin: form.get('heureFin'),
			commentaire: form.get('commentaire'),
			nbMns: form.get('nbMns'),
			nbBnssa: form.get('nbBnssa')
		});
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Champs invalides',
				values: Object.fromEntries(form)
			});
		}

		const id = await creerBesoin(admin.id, parsed.data);
		throw redirect(303, `/besoins/${id}`);
	}
};
