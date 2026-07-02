import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import {
	creerType,
	definirTypeActif,
	listerTypes,
	modifierType
} from '$lib/server/services/documents';
import { documentTypeSchema } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return { types: await listerTypes() };
};

function parse(form: FormData) {
	return documentTypeSchema.safeParse({
		libelle: form.get('libelle'),
		obligatoire: form.get('obligatoire'),
		niveauRequis: form.get('niveauRequis'),
		ordre: form.get('ordre')
	});
}

export const actions: Actions = {
	creer: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const parsed = parse(await request.formData());
		if (!parsed.success) {
			return fail(400, { action: 'creer', error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}
		await creerType(parsed.data);
		return { action: 'creer', ok: true };
	},

	modifier: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { action: 'modifier', error: 'Type introuvable.' });
		const parsed = parse(form);
		if (!parsed.success) {
			return fail(400, { action: 'modifier', error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}
		await modifierType(id, parsed.data);
		return { action: 'modifier', ok: true };
	},

	activer: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const actif = form.get('actif') === 'true';
		if (!id) return fail(400, { action: 'activer', error: 'Type introuvable.' });
		await definirTypeActif(id, actif);
		return { action: 'activer', ok: true, actif };
	}
};
