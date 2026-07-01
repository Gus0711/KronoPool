import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '$lib/server/auth/guards';
import {
	assignerPoste,
	detailBesoin,
	libererPoste,
	modifierBesoin,
	supprimerBesoin,
	supprimerPoste,
	type AssignationResult
} from '$lib/server/services/besoins';
import { listerIntervenants } from '$lib/server/services/intervenants';
import { estEligible } from '$lib/server/services/eligibilite';
import { besoinCreate } from '$lib/server/validation';
import type { Niveau } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await detailBesoin(params.id);
	if (!detail) throw error(404, 'Besoin introuvable');

	// Intervenants actifs éligibles, indexés par niveau de poste (pour l'assignation).
	const actifs = (await listerIntervenants()).filter((i) => i.actif && i.niveau);
	const mini = (i: (typeof actifs)[number]) => ({
		id: i.id,
		nom: i.nom,
		prenom: i.prenom,
		niveau: i.niveau
	});
	const eligibles: Record<Niveau, ReturnType<typeof mini>[]> = {
		MNS: actifs.filter((i) => estEligible(i.niveau, 'MNS')).map(mini),
		BNSSA: actifs.filter((i) => estEligible(i.niveau, 'BNSSA')).map(mini)
	};

	return { detail, eligibles };
};

const MSG_ASSIGN: Record<Exclude<AssignationResult, { ok: true }>['reason'], string> = {
	introuvable: 'Poste introuvable.',
	intervenant_invalide: 'Intervenant invalide ou compte inactif.',
	ineligible: "Cet intervenant n'a pas le niveau requis pour ce poste.",
	deja_pris: 'Ce poste vient d’être réservé.',
	deja_sur_besoin: 'Cet intervenant occupe déjà un poste de ce besoin.'
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

	assigner: async ({ request, locals }) => {
		const admin = requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = z
			.object({ posteId: z.string().min(1), intervenantId: z.string().min(1) })
			.safeParse({
				posteId: form.get('posteId'),
				intervenantId: form.get('intervenantId')
			});
		if (!parsed.success) return fail(400, { action: 'assigner', error: 'Requête invalide.' });

		const res = await assignerPoste(admin.id, parsed.data.posteId, parsed.data.intervenantId);
		if (!res.ok) return fail(400, { action: 'assigner', error: MSG_ASSIGN[res.reason] });
		return { action: 'assigner', ok: true };
	},

	supprimerPoste: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = z.object({ posteId: z.string().min(1) }).safeParse({
			posteId: form.get('posteId')
		});
		if (!parsed.success) return fail(400, { action: 'supprimerPoste', error: 'Requête invalide.' });

		const ok = await supprimerPoste(parsed.data.posteId);
		return { action: 'supprimerPoste', ok };
	},

	modifier: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const parsed = besoinCreate.safeParse({
			date: form.get('date'),
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
				action: 'modifier',
				error: parsed.error.issues[0]?.message ?? 'Champs invalides'
			});
		}
		const res = await modifierBesoin(params.id, parsed.data);
		if (!res.ok) return fail(400, { action: 'modifier', error: res.error });
		return { action: 'modifier', ok: true };
	},

	supprimer: async ({ locals, params }) => {
		requireAdmin(locals.user);
		await supprimerBesoin(params.id);
		throw redirect(303, '/besoins');
	}
};
