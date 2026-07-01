import { listerBesoins } from '$lib/server/services/besoins';
import type { PageServerLoad } from './$types';

/** Planning global — lecture seule (CDC §6.2). */
export const load: PageServerLoad = async () => {
	const { aVenir, passes } = await listerBesoins();
	return { besoins: [...aVenir, ...passes] };
};
