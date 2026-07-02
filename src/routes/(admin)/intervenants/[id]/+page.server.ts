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
import {
	etatConformite,
	getDocument,
	listerDocumentsDe,
	listerTypesActifs,
	supprimerDocument,
	traiterUploadForm
} from '$lib/server/services/documents';
import { intervenantSchema, motDePasse } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const intervenant = await getIntervenant(params.id);
	if (!intervenant) throw error(404, 'Intervenant introuvable');
	return {
		intervenant,
		documents: await listerDocumentsDe(intervenant.id),
		typesDocuments: await listerTypesActifs(),
		conformite: await etatConformite({ id: intervenant.id, niveau: intervenant.niveau })
	};
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
	},

	uploadDocument: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals.user);
		const intervenant = await getIntervenant(params.id);
		if (!intervenant) return fail(404, { action: 'uploadDocument', error: 'Intervenant introuvable.' });
		const form = await request.formData();
		const res = await traiterUploadForm(form, params.id, admin.id);
		if (!res.ok) return fail(400, { action: 'uploadDocument', error: res.error });
		return { action: 'uploadDocument', success: true };
	},

	supprimerDocument: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const doc = await getDocument(id);
		if (!doc || doc.userId !== params.id) {
			return fail(404, { action: 'supprimerDocument', error: 'Document introuvable.' });
		}
		await supprimerDocument(id);
		return { action: 'supprimerDocument', success: true };
	}
};
