import { fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import { creerBesoin } from '$lib/server/services/besoins';
import { besoinCreate } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const heureRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const clean = (v: string | null, re: RegExp) => (v && re.test(v) ? v : '');

/** Pré-remplissage depuis le planning (clic sur un créneau) via les paramètres d'URL. */
export const load: PageServerLoad = ({ url }) => ({
	defaults: {
		date: clean(url.searchParams.get('date'), dateRe),
		heureDebut: clean(url.searchParams.get('debut'), heureRe),
		heureFin: clean(url.searchParams.get('fin'), heureRe)
	}
});

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
