/**
 * Réparation des colonnes d'horodatage stockées par erreur en TEXTE.
 *
 * Contexte : les colonnes `mode: 'timestamp'` (Drizzle) doivent contenir un
 * ENTIER de secondes Unix. Une donnée héritée stockée en chaîne ISO
 * (« 2026-07-04T10:00:00Z ») fait lire une Date invalide → « Invalid time value »
 * à l'affichage. Ce script détecte ces valeurs et les convertit en entier.
 *
 * Usage :
 *   node --env-file-if-exists=.env scripts/repair-timestamps.mjs           # DRY-RUN (rapport seul)
 *   node --env-file-if-exists=.env scripts/repair-timestamps.mjs --apply   # applique la correction
 *   npm run db:repair-timestamps           /  npm run db:repair-timestamps -- --apply
 *
 * Sans effet si aucune valeur textuelle n'est trouvée. Idempotent.
 */
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL ?? 'file:/data/app.db';
const APPLY = process.argv.includes('--apply');

const client = createClient({
	url,
	...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {})
});

// Toutes les colonnes `mode: 'timestamp'` du schéma (entier de secondes attendu).
const COLUMNS = [
	['user', 'created_at'],
	['user', 'updated_at'],
	['session', 'expires_at'],
	['besoin', 'created_at'],
	['besoin', 'updated_at'],
	['poste', 'reserved_at'],
	['audit_log', 'created_at'],
	['document_type', 'created_at'],
	['document_type', 'updated_at'],
	['document', 'uploaded_at'],
	['push_subscription', 'created_at'],
	['rappel', 'sent_at']
];

// Convertit une chaîne ISO en secondes Unix (retire T/Z pour un parsing fiable).
const conv = (col) => `unixepoch(replace(replace(${col},'T',' '),'Z',''))`;

async function tableExiste(nom) {
	const r = await client.execute({
		sql: "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
		args: [nom]
	});
	return r.rows.length > 0;
}

console.log(`Base : ${url}`);
console.log(APPLY ? 'Mode : APPLICATION (--apply)\n' : 'Mode : DRY-RUN (aucune écriture)\n');

let totalText = 0;
let totalFixed = 0;
let totalFailed = 0;

for (const [table, col] of COLUMNS) {
	if (!(await tableExiste(table))) continue;
	const bad = Number(
		(await client.execute(`SELECT count(*) n FROM ${table} WHERE typeof(${col})='text'`)).rows[0].n
	);
	if (bad === 0) continue;

	totalText += bad;
	const ex = (
		await client.execute(`SELECT ${col} v FROM ${table} WHERE typeof(${col})='text' LIMIT 3`)
	).rows.map((r) => JSON.stringify(r.v));
	console.log(`• ${table}.${col} : ${bad} valeur(s) textuelle(s) — ex. ${ex.join(', ')}`);

	if (APPLY) {
		await client.execute(
			`UPDATE ${table} SET ${col} = ${conv(col)} WHERE typeof(${col})='text' AND ${conv(col)} IS NOT NULL`
		);
		const reste = Number(
			(await client.execute(`SELECT count(*) n FROM ${table} WHERE typeof(${col})='text'`)).rows[0]
				.n
		);
		totalFixed += bad - reste;
		totalFailed += reste;
		console.log(
			`    → ${bad - reste} corrigée(s)` +
				(reste ? `, ${reste} non convertible(s) — à traiter à la main` : '')
		);
	}
}

if (totalText === 0) {
	console.log('✔ Aucune valeur d’horodatage textuelle. Rien à faire.');
} else if (!APPLY) {
	console.log(`\n${totalText} valeur(s) à corriger. Relancez avec --apply pour appliquer.`);
} else {
	console.log(`\n✔ Terminé : ${totalFixed} corrigée(s), ${totalFailed} non convertible(s).`);
}

client.close();
