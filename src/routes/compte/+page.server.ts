import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { env as pubEnv } from '$env/dynamic/public';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from '$lib/server/auth/password';
import { generateSessionToken } from '$lib/server/auth/session';
import { requireUser } from '$lib/server/auth/guards';
import { statutValidite } from '$lib/server/services/diplomes';
import {
	etatConformite,
	getDocument,
	listerDocumentsDe,
	listerTypesActifs,
	supprimerDocument,
	traiterUploadForm
} from '$lib/server/services/documents';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const u = requireUser(locals.user);
	const full = await db.select().from(user).where(eq(user.id, u.id)).get();
	if (!full) throw fail(404);

	const estIntervenant = full.role === 'intervenant';
	// URL absolue de l'abonnement calendrier (null tant que non activé).
	const calendrierUrl =
		estIntervenant && full.calendarToken ? `${url.origin}/calendrier/${full.calendarToken}.ics` : null;

	return {
		infos: {
			nom: full.nom,
			prenom: full.prenom,
			email: full.email,
			telephone: full.telephone,
			niveau: full.niveau,
			role: full.role
		},
		validites: {
			titre: { date: full.dateValiditeTitre, ...statutValidite(full.dateValiditeTitre) },
			pse: { date: full.dateValiditePse, ...statutValidite(full.dateValiditePse) }
		},
		documents: estIntervenant ? await listerDocumentsDe(full.id) : [],
		typesDocuments: estIntervenant ? await listerTypesActifs() : [],
		conformite: estIntervenant
			? await etatConformite({ id: full.id, niveau: full.niveau })
			: { lignes: [], manquants: 0, enAlerte: false },
		// Clé publique VAPID pour l'abonnement push côté client (null si push désactivé).
		pushPublicKey: pubEnv.PUBLIC_VAPID_KEY || null,
		calendrierUrl
	};
};

const mdpSchema = z
	.object({
		current: z.string().min(1, 'Mot de passe actuel requis'),
		password: z.string().min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`),
		confirm: z.string()
	})
	.refine((d) => d.password === d.confirm, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirm']
	});

export const actions: Actions = {
	motDePasse: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		const form = await request.formData();
		const parsed = mdpSchema.safeParse({
			current: form.get('current'),
			password: form.get('password'),
			confirm: form.get('confirm')
		});
		if (!parsed.success) {
			return fail(400, { action: 'motDePasse', error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}

		const full = await db.select().from(user).where(eq(user.id, u.id)).get();
		if (!full) return fail(404, { action: 'motDePasse', error: 'Compte introuvable.' });

		const ok = await verifyPassword(full.passwordHash, parsed.data.current);
		if (!ok) return fail(400, { action: 'motDePasse', error: 'Mot de passe actuel incorrect.' });

		const passwordHash = await hashPassword(parsed.data.password);
		await db
			.update(user)
			.set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
			.where(eq(user.id, u.id));

		return { action: 'motDePasse', success: true };
	},

	uploadDocument: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		const form = await request.formData();
		const res = await traiterUploadForm(form, u.id, u.id);
		if (!res.ok) return fail(400, { action: 'uploadDocument', error: res.error });
		return { action: 'uploadDocument', success: true };
	},

	supprimerDocument: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const doc = await getDocument(id);
		// Un intervenant ne supprime que SES documents.
		if (!doc || doc.userId !== u.id) {
			return fail(404, { action: 'supprimerDocument', error: 'Document introuvable.' });
		}
		await supprimerDocument(id);
		return { action: 'supprimerDocument', success: true };
	},

	/**
	 * Active l'abonnement calendrier (crée un jeton s'il n'existe pas). Avec le
	 * champ `regenerer`, remplace le jeton existant → l'ancien lien cesse de
	 * fonctionner (révocation d'un lien partagé par erreur).
	 */
	calendrier: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		if (u.role !== 'intervenant') return fail(403, { action: 'calendrier', error: 'Réservé aux intervenants.' });
		const form = await request.formData();
		const regenerer = form.get('regenerer') === 'true';

		const full = await db.select({ token: user.calendarToken }).from(user).where(eq(user.id, u.id)).get();
		if (full?.token && !regenerer) return { action: 'calendrier', success: true };

		await db
			.update(user)
			.set({ calendarToken: generateSessionToken(), updatedAt: new Date() })
			.where(eq(user.id, u.id));
		return { action: 'calendrier', success: true, regenere: regenerer };
	}
};
