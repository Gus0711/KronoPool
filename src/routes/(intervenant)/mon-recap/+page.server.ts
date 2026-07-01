import { requireIntervenant } from '$lib/server/auth/guards';
import { recapHeures } from '$lib/server/services/reservations';
import type { PageServerLoad } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireIntervenant(locals.user);
	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const recap = await recapHeures(user.id, from, to);
	return { recap, from: from ?? '', to: to ?? '' };
};
