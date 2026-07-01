import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword, PASSWORD_MIN_LENGTH } from '$lib/server/auth/password';
import { requireUser, homePathFor } from '$lib/server/auth/guards';
import type { Actions, PageServerLoad } from './$types';

const schema = z
	.object({
		password: z.string().min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`),
		confirm: z.string()
	})
	.refine((d) => d.password === d.confirm, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirm']
	});

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals.user);
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const u = requireUser(locals.user);
		const form = await request.formData();
		const parsed = schema.safeParse({
			password: form.get('password'),
			confirm: form.get('confirm')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Champs invalides' });
		}

		const passwordHash = await hashPassword(parsed.data.password);
		await db
			.update(user)
			.set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
			.where(eq(user.id, u.id));

		throw redirect(303, homePathFor({ ...u, mustChangePassword: false }));
	}
};
