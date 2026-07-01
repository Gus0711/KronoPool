import { listerBesoins } from '$lib/server/services/besoins';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { aVenir, passes } = await listerBesoins();
	return { aVenir, passes };
};
