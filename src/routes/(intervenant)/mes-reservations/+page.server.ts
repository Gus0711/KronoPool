import { env } from '$env/dynamic/public';
import { requireIntervenant } from '$lib/server/auth/guards';
import { mesReservations } from '$lib/server/services/reservations';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireIntervenant(locals.user);
	const reservations = await mesReservations(user.id);
	return { reservations, directeurTel: env.PUBLIC_DIRECTEUR_TEL ?? '' };
};
