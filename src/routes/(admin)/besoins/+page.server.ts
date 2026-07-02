import { listerBesoins } from '$lib/server/services/besoins';
import type { PageServerLoad } from './$types';

const toInt = (v: string | null): number | null => {
	if (v === null) return null;
	const n = Number(v);
	return Number.isInteger(n) && n >= 0 ? n : null;
};

export const load: PageServerLoad = async ({ url }) => {
	const { aVenir, passes } = await listerBesoins();
	return {
		aVenir,
		passes,
		// Retour de la création récurrente / suppression de série (bandeau de confirmation).
		serieCreees: toInt(url.searchParams.get('serie_creees')),
		serieSupprimes: toInt(url.searchParams.get('serie_supprimes')),
		serieConserves: toInt(url.searchParams.get('serie_conserves'))
	};
};
