import { z } from 'zod';
import { requireIntervenant } from '$lib/server/auth/guards';
import { listerCreneaux, reserverPoste } from '$lib/server/services/creneaux';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireIntervenant(locals.user);
	const creneaux = await listerCreneaux(user.niveau);
	return { creneaux, niveau: user.niveau };
};

const messages: Record<string, string> = {
	introuvable: 'Ce créneau n’existe plus.',
	ineligible: 'Ce créneau ne correspond pas à votre niveau.',
	passe: 'Ce créneau est déjà passé.',
	deja_pris: 'Ce créneau vient d’être réservé.'
};

export const actions: Actions = {
	reserver: async ({ request, locals }) => {
		const user = requireIntervenant(locals.user);
		const form = await request.formData();
		const parsed = z.object({ posteId: z.string().min(1) }).safeParse({
			posteId: form.get('posteId')
		});
		if (!parsed.success) {
			return { ok: false as const, message: 'Requête invalide.', posteId: '' };
		}

		const posteId = parsed.data.posteId;
		const result = await reserverPoste(user.id, user.niveau, posteId);
		if (result.ok) {
			return { ok: true as const, message: 'Créneau réservé ✓', posteId };
		}
		return { ok: false as const, message: messages[result.reason], posteId };
	}
};
