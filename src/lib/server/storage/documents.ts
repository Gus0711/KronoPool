import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';

/**
 * Stockage disque des documents des intervenants.
 *
 * Les fichiers vivent sur le **volume persistant** (le même que la base SQLite),
 * sous `<racine>/documents/<userId>/<storedName>`. Aucune URL publique : les
 * fichiers ne sont servis que par l'endpoint protégé (guards de rôle + propriété).
 *
 * Racine résolue automatiquement :
 * - `DOCUMENTS_DIR` si défini (prioritaire) ;
 * - sinon dérivée de `DATABASE_URL` (`file:./data/app.db` → `./data/documents`,
 *   `file:/data/app.db` → `/data/documents` en Docker) ;
 * - sinon `./data/documents`.
 *
 * Ce module isole toute la mécanique disque : un futur passage vers un stockage
 * objet (S3/R2) ne toucherait que ce fichier.
 */

function racineDocuments(): string {
	if (env.DOCUMENTS_DIR) return env.DOCUMENTS_DIR;
	const dbUrl = env.DATABASE_URL ?? 'file:./data/app.db';
	if (dbUrl.startsWith('file:')) {
		const p = dbUrl.slice('file:'.length);
		return path.join(path.dirname(p), 'documents');
	}
	return path.join('.', 'data', 'documents');
}

/** Chemin absolu (relatif au cwd) d'un fichier stocké. */
export function documentPath(userId: string, storedName: string): string {
	return path.join(racineDocuments(), userId, storedName);
}

/** Écrit le binaire sur disque (crée le dossier de l'utilisateur au besoin). */
export async function saveFile(
	userId: string,
	storedName: string,
	data: Buffer | Uint8Array
): Promise<void> {
	const dir = path.join(racineDocuments(), userId);
	await mkdir(dir, { recursive: true });
	await writeFile(documentPath(userId, storedName), data);
}

/** Supprime un fichier ; ignore silencieusement s'il n'existe déjà plus. */
export async function deleteFile(userId: string, storedName: string): Promise<void> {
	await rm(documentPath(userId, storedName), { force: true });
}

/** Lit le fichier en mémoire pour le servir (endpoint de téléchargement). */
export function readFileBuffer(userId: string, storedName: string): Promise<Buffer> {
	return readFile(documentPath(userId, storedName));
}
