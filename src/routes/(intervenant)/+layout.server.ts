import { requireIntervenant } from '$lib/server/auth/guards';
import { etatConformite } from '$lib/server/services/documents';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireIntervenant(locals.user);
	const conformite = await etatConformite({ id: user.id, niveau: user.niveau });
	return { user, docsManquants: conformite.manquants };
};
