import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

/**
 * Client libSQL + Drizzle.
 * Local : `DATABASE_URL=file:./data/app.db`.
 * Futur : URL Turso distante + `DATABASE_AUTH_TOKEN` — **même code**, seul l'env change.
 */
const url = env.DATABASE_URL ?? 'file:./data/app.db';

const client = createClient({
	url,
	...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {})
});

export const db = drizzle(client, { schema });
export { schema };
