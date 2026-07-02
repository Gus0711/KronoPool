import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { requireIntervenant } from '$lib/server/auth/guards';
import { listerCreneaux, reserverPoste } from '$lib/server/services/creneaux';
import { notifierReservationAuxAdmins } from '$lib/server/push/notifications';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireIntervenant(locals.user);
	const creneaux = await listerCreneaux(user.niveau, user.id);
	return { creneaux, niveau: user.niveau, directeurTel: env.PUBLIC_DIRECTEUR_TEL ?? '' };
};

const messages: Record<string, string> = {
	introuvable: 'Ce créneau n’existe plus.',
	ineligible: 'Ce créneau ne correspond pas à votre niveau.',
	passe: 'Ce créneau est déjà passé.',
	deja_pris: 'Ce créneau vient d’être réservé.',
	deja_sur_besoin: 'Vous avez déjà un poste sur ce créneau.'
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
			// Informe les administrateurs du remplissage (fire-and-forget).
			void notifierReservationAuxAdmins(posteId, user.id);
			return { ok: true as const, message: 'Créneau réservé ✓', posteId };
		}
		return { ok: false as const, message: messages[result.reason], posteId };
	}
};
