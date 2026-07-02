import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { reservationsCalendrier } from '$lib/server/services/reservations';
import { construireIcal } from '$lib/server/ical';
import type { RequestHandler } from './$types';

/**
 * Flux iCal **public** authentifié par un jeton secret dans l'URL (capability).
 * Aucune session : les applications calendrier (Google/Apple…) ne présentent pas
 * de cookie. Le jeton est régénérable côté compte pour révoquer un lien fuité.
 * Cette route est exemptée des guards dans `hooks.server.ts`.
 */
export const GET: RequestHandler = async ({ params }) => {
	const token = params.token.replace(/\.ics$/i, '');
	if (token.length < 20) throw error(404, 'Calendrier introuvable');

	const u = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.calendarToken, token))
		.get();
	if (!u) throw error(404, 'Calendrier introuvable');

	const creneaux = await reservationsCalendrier(u.id);
	const ics = construireIcal(creneaux, new Date());

	return new Response(ics, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'inline; filename="kronopool.ics"',
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
