import { listerBesoins } from '$lib/server/services/besoins';
import { listerIntervenants } from '$lib/server/services/intervenants';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { aVenir } = await listerBesoins();
	const intervenants = await listerIntervenants();

	const postesNonPourvus = aVenir.reduce((s, b) => s + (b.total - b.pourvus), 0);
	const besoinsAvecLibres = aVenir.filter((b) => b.pourvus < b.total);
	const alertes = intervenants.filter((i) => i.enAlerte);

	return {
		prochains: aVenir.slice(0, 6),
		nbBesoinsAVenir: aVenir.length,
		postesNonPourvus,
		besoinsAvecLibres: besoinsAvecLibres.slice(0, 6),
		alertes
	};
};
