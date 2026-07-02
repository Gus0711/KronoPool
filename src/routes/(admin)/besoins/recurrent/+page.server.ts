import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import { creerBesoinsRecurrents } from '$lib/server/services/besoins';
import { besoinRecurrent } from '$lib/server/validation';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const admin = requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = besoinRecurrent.safeParse({
			jours: form.getAll('jours'),
			dateDebut: form.get('dateDebut'),
			dateFin: form.get('dateFin'),
			heureDebut: form.get('heureDebut'),
			heureFin: form.get('heureFin'),
			pauseDebut: form.get('pauseDebut'),
			pauseFin: form.get('pauseFin'),
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

		const res = await creerBesoinsRecurrents(admin.id, parsed.data);
		if (res.count === 0) {
			return fail(400, {
				error: 'Aucune date ne correspond aux jours choisis sur cette période.',
				values: Object.fromEntries(form)
			});
		}
		throw redirect(303, `/besoins?serie_creees=${res.count}`);
	}
};
