import { recapGlobal } from '$lib/server/services/recap-global';
import type { PageServerLoad } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);

export const load: PageServerLoad = async ({ url }) => {
	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const lignes = await recapGlobal(from, to);
	const totalGlobal = lignes.reduce((s, l) => s + l.totalHeures, 0);
	return { lignes, totalGlobal, from: from ?? '', to: to ?? '' };
};
