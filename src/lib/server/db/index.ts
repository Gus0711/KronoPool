import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

/**
 * Client libSQL + Drizzle, en connexion **paresseuse** (lazy).
 *
 * La connexion n'est ouverte qu'au **premier accès réel** à `db` (une requête),
 * jamais à l'import du module. Indispensable : pendant `vite build` (analyse /
 * prerender), les modules serveur sont importés alors que `./data/app.db` peut
 * ne pas exister — une ouverture à l'import ferait échouer le build
 * (`ConnectionFailed ... 14`).
 *
 * Local : `DATABASE_URL=file:./data/app.db`.
 * Futur : URL Turso distante + `DATABASE_AUTH_TOKEN` — **même code**, seul l'env change.
 */
type DB = LibSQLDatabase<typeof schema>;

let instance: DB | null = null;

function getDb(): DB {
	if (!instance) {
		const url = env.DATABASE_URL ?? 'file:./data/app.db';
		const client = createClient({
			url,
			...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {})
		});
		instance = drizzle(client, { schema });
	}
	return instance;
}

/**
 * Proxy transparent : même API que l'instance Drizzle (`db.select()`,
 * `db.transaction()`, …) mais initialise la connexion à la volée. Les fichiers
 * consommateurs n'ont rien à changer.
 */
export const db = new Proxy({} as DB, {
	get(_target, prop) {
		const real = getDb();
		const value = Reflect.get(real, prop, real);
		return typeof value === 'function' ? value.bind(real) : value;
	}
}) as DB;

export { schema };
