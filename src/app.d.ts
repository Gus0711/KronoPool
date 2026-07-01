import type { SessionUser } from '$lib/server/auth/session';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			sessionToken: string | null;
		}
		interface PageData {
			user?: SessionUser | null;
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};
