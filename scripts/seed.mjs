/**
 * Seed runtime des **comptes admin** (JS pur, sans TypeScript ni drizzle-kit) —
 * exécutable dans l'image Docker de production. Idempotent : un admin déjà présent
 * (même email) est ignoré. Lancé au démarrage du conteneur par docker-entrypoint.sh.
 *
 * Paramètres Argon2id **alignés** sur src/lib/server/auth/password.ts (m=19MiB, t=2, p=1),
 * indispensable pour que les mots de passe se vérifient à la connexion.
 */
import { createClient } from '@libsql/client';
import { hash } from '@node-rs/argon2';

const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

const url = process.env.DATABASE_URL ?? 'file:/data/app.db';
const client = createClient({
	url,
	...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {})
});

async function seedAdmin(n) {
	const email = process.env[`ADMIN${n}_EMAIL`];
	const password = process.env[`ADMIN${n}_PASSWORD`];
	const nom = process.env[`ADMIN${n}_NOM`] ?? 'Admin';
	const prenom = process.env[`ADMIN${n}_PRENOM`] ?? String(n);

	if (!email || !password) {
		console.warn(`⚠️  ADMIN${n}_EMAIL / ADMIN${n}_PASSWORD manquant — admin ${n} ignoré.`);
		return;
	}

	const existing = await client.execute({
		sql: 'SELECT id FROM user WHERE email = ?',
		args: [email]
	});
	if (existing.rows.length > 0) {
		console.log(`• Admin ${n} (${email}) déjà présent — ignoré.`);
		return;
	}

	const passwordHash = await hash(password, ARGON);
	await client.execute({
		sql: `INSERT INTO user (id, role, nom, prenom, email, niveau, password_hash, must_change_password, actif)
		      VALUES (?, 'admin', ?, ?, ?, NULL, ?, 1, 1)`,
		args: [crypto.randomUUID(), nom, prenom, email, passwordHash]
	});
	console.log(`✓ Admin ${n} créé : ${email} (mot de passe à changer à la 1ʳᵉ connexion).`);
}

await seedAdmin(1);
await seedAdmin(2);
client.close();
