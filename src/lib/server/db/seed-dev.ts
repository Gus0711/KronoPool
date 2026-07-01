/**
 * Seed de **démonstration** (développement uniquement) : 2 intervenants + besoins futurs.
 * Exécution : `npm run db:seed:dev`. Idempotent sur les emails intervenants.
 * ⚠️ Mots de passe simples et `must_change_password = false` pour faciliter les tests.
 */
import { mkdirSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { user, besoin, poste } from './schema.ts';

const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

function ensureDataDir(url: string): void {
	const m = url.match(/^file:(.+)$/);
	if (!m) return;
	const path = m[1].replace(/[\\/][^\\/]*$/, '');
	if (path) mkdirSync(path, { recursive: true });
}

function isoPlus(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
	const url = process.env.DATABASE_URL ?? 'file:./data/app.db';
	ensureDataDir(url);
	const client = createClient({ url });
	const db = drizzle(client);

	const mdp = await hash('motdepasse', ARGON);

	async function upsertIntervenant(
		email: string,
		nom: string,
		prenom: string,
		niveau: 'MNS' | 'BNSSA'
	): Promise<string> {
		const existing = await db.select().from(user).where(eq(user.email, email)).get();
		if (existing) return existing.id;
		const id = crypto.randomUUID();
		await db.insert(user).values({
			id,
			role: 'intervenant',
			nom,
			prenom,
			email,
			telephone: '06 12 34 56 78',
			niveau,
			dateValiditeTitre: isoPlus(400),
			dateValiditePse: isoPlus(20), // bientôt expiré → alerte dashboard
			passwordHash: mdp,
			mustChangePassword: false,
			actif: true
		});
		return id;
	}

	const mns = await upsertIntervenant('camille@piscine.fr', 'Rivière', 'Camille', 'MNS');
	await upsertIntervenant('bruno@piscine.fr', 'Nageur', 'Bruno', 'BNSSA');

	// Admin auteur des besoins.
	const admin = await db.select().from(user).where(eq(user.role, 'admin')).get();
	const adminId = admin?.id ?? mns;

	// Quelques besoins futurs avec postes MNS + BNSSA.
	const plans = [
		{ date: isoPlus(1), hd: '09:00', hf: '13:00', com: 'Bassin sportif · renfort matin', mns: 1, bnssa: 2 },
		{ date: isoPlus(1), hd: '14:00', hf: '18:00', com: 'Cours + surveillance', mns: 1, bnssa: 1 },
		{ date: isoPlus(2), hd: '10:00', hf: '13:00', com: 'Bassin ludique', mns: 0, bnssa: 2 }
	];

	for (const p of plans) {
		const bid = crypto.randomUUID();
		await db.insert(besoin).values({
			id: bid,
			date: p.date,
			heureDebut: p.hd,
			heureFin: p.hf,
			commentaire: p.com,
			createdBy: adminId
		});
		const postes: { besoinId: string; niveauRequis: 'MNS' | 'BNSSA' }[] = [];
		for (let i = 0; i < p.mns; i++) postes.push({ besoinId: bid, niveauRequis: 'MNS' });
		for (let i = 0; i < p.bnssa; i++) postes.push({ besoinId: bid, niveauRequis: 'BNSSA' });
		await db.insert(poste).values(postes);
	}

	console.log('✔ Seed dev : intervenants camille@ (MNS) / bruno@ (BNSSA), mot de passe « motdepasse » ; 3 besoins futurs.');
	client.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
