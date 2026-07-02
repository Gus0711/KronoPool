/**
 * Seed — crée les **2 comptes admin** initiaux (CDC §8/§10).
 *
 * Exécution : `npm run db:seed` (charge `.env`, applique les migrations `drizzle/`
 * puis insère les admins). Idempotent : un admin déjà présent (même email) est ignoré.
 *
 * Autonome (ne dépend pas de l'alias SvelteKit `$env`) : lit `process.env`.
 */
import { mkdirSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq, sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { user, documentType } from './schema.ts';

const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

function ensureDataDir(url: string): void {
	const m = url.match(/^file:(.+)$/);
	if (!m) return;
	const path = m[1].replace(/[\\/][^\\/]*$/, '');
	if (path) mkdirSync(path, { recursive: true });
}

async function seedAdmin(
	db: ReturnType<typeof drizzle>,
	n: 1 | 2
): Promise<void> {
	const email = process.env[`ADMIN${n}_EMAIL`];
	const password = process.env[`ADMIN${n}_PASSWORD`];
	const nom = process.env[`ADMIN${n}_NOM`] ?? 'Admin';
	const prenom = process.env[`ADMIN${n}_PRENOM`] ?? String(n);

	if (!email || !password) {
		console.warn(`⚠️  ADMIN${n}_EMAIL / ADMIN${n}_PASSWORD manquant — admin ${n} ignoré.`);
		return;
	}

	const existing = await db.select().from(user).where(eq(user.email, email)).get();
	if (existing) {
		console.log(`• Admin ${n} (${email}) déjà présent — ignoré.`);
		return;
	}

	const passwordHash = await hash(password, ARGON);
	await db.insert(user).values({
		role: 'admin',
		nom,
		prenom,
		email,
		niveau: null,
		passwordHash,
		mustChangePassword: true,
		actif: true
	});
	console.log(`✓ Admin ${n} créé : ${email} (mot de passe à changer à la 1ʳᵉ connexion).`);
}

/** Types de documents par défaut — seulement si la table est vide (idempotent). */
async function seedDocumentTypes(db: ReturnType<typeof drizzle>): Promise<void> {
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)` })
		.from(documentType);
	if (Number(n) > 0) {
		console.log('• Types de documents déjà présents — ignoré.');
		return;
	}
	await db.insert(documentType).values([
		{ libelle: "Carte d'identité", obligatoire: true, niveauRequis: null, ordre: 1 },
		{ libelle: 'Diplôme (BNSSA / MNS)', obligatoire: true, niveauRequis: null, ordre: 2 },
		{ libelle: 'PSE1 (secourisme)', obligatoire: true, niveauRequis: null, ordre: 3 },
		{ libelle: 'RIB', obligatoire: false, niveauRequis: null, ordre: 4 },
		{ libelle: 'Autre', obligatoire: false, niveauRequis: null, ordre: 5 }
	]);
	console.log('✓ Types de documents par défaut créés.');
}

async function main(): Promise<void> {
	const url = process.env.DATABASE_URL ?? 'file:./data/app.db';
	ensureDataDir(url);

	const client = createClient({
		url,
		...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {})
	});
	const db = drizzle(client);

	console.log('→ Application des migrations…');
	await migrate(db, { migrationsFolder: './drizzle' });

	console.log('→ Seed des comptes admin…');
	await seedAdmin(db, 1);
	await seedAdmin(db, 2);

	console.log('→ Seed des types de documents…');
	await seedDocumentTypes(db);

	console.log('✔ Seed terminé.');
	client.close();
}

main().catch((err) => {
	console.error('✗ Échec du seed :', err);
	process.exit(1);
});
