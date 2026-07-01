import { requireIntervenant } from '$lib/server/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireIntervenant(locals.user);
	return { user };
};
