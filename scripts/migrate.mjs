/**
 * Application des migrations Drizzle (runtime, sans TypeScript ni drizzle-kit).
 * Utilisé au démarrage du conteneur et disponible via `npm run db:migrate:apply`.
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const url = process.env.DATABASE_URL ?? 'file:/data/app.db';
const client = createClient({
	url,
	...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {})
});

await migrate(drizzle(client), { migrationsFolder: './drizzle' });
console.log('✔ Migrations appliquées.');
client.close();
