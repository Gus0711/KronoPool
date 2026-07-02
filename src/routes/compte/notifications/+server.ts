import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth/guards';
import { enregistrerAbonnement, supprimerAbonnement } from '$lib/server/push/webpush';
import type { RequestHandler } from './$types';

const abonnement = z.object({
	endpoint: z.string().url(),
	keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
});

/** Enregistre l'abonnement push de l'appareil courant pour l'utilisateur connecté. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const u = requireUser(locals.user);
	const parsed = abonnement.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Abonnement invalide');
	await enregistrerAbonnement(u.id, parsed.data);
	return json({ ok: true });
};

/** Désabonne l'appareil courant. */
export const DELETE: RequestHandler = async ({ locals, request }) => {
	const u = requireUser(locals.user);
	const parsed = z
		.object({ endpoint: z.string().url() })
		.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');
	await supprimerAbonnement(u.id, parsed.data.endpoint);
	return json({ ok: true });
};
