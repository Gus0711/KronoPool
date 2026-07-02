import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { document, documentType, type Niveau } from '../db/schema';
import { deleteFile, saveFile } from '../storage/documents';
import { documentUploadSchema } from '../validation';
import { statutValidite, type ValiditeInfo } from './diplomes';
import {
	MIME_AUTORISES,
	TAILLE_MAX,
	estMimeAutorise,
	statutDocuments,
	type Conformite,
	type ConformiteLigne
} from './conformite';

/**
 * Documents des intervenants (CDC — extension profil).
 *
 * - Types de documents **configurables par l'admin** ({@link documentType}),
 *   certains marqués `obligatoire` (éventuellement restreints à un niveau).
 * - Fichiers stockés sur disque via `../storage/documents` ; ici on ne manipule
 *   que les métadonnées ; la logique de conformité pure vit dans `./conformite`.
 */

// Ré-exports pour les consommateurs (pages, composants).
export {
	MIME_AUTORISES,
	TAILLE_MAX,
	estMimeAutorise,
	conformiteVersValidite,
	type Conformite,
	type ConformiteLigne,
	type StatutConformite
} from './conformite';

// --- Types de documents (catalogue admin) --------------------------------

export interface TypeInput {
	libelle: string;
	obligatoire: boolean;
	niveauRequis: Niveau | null;
	ordre: number;
}

/** Tous les types (admin), triés par ordre puis libellé. */
export async function listerTypes() {
	return db.select().from(documentType).orderBy(documentType.ordre, documentType.libelle);
}

/** Types actifs uniquement (formulaires d'upload). */
export async function listerTypesActifs() {
	return db
		.select()
		.from(documentType)
		.where(eq(documentType.actif, true))
		.orderBy(documentType.ordre, documentType.libelle);
}

export async function creerType(data: TypeInput): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(documentType).values({ id, ...data, actif: true });
	return id;
}

export async function modifierType(id: string, data: TypeInput): Promise<void> {
	await db
		.update(documentType)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(documentType.id, id));
}

/** Active/désactive un type (les documents rattachés sont conservés). */
export async function definirTypeActif(id: string, actif: boolean): Promise<void> {
	await db
		.update(documentType)
		.set({ actif, updatedAt: new Date() })
		.where(eq(documentType.id, id));
}

// --- Documents d'un intervenant ------------------------------------------

export interface DocumentView {
	id: string;
	typeId: string | null;
	typeLibelle: string | null;
	nomFichier: string;
	mimeType: string;
	taille: number;
	dateExpiration: string | null;
	uploadedAt: Date;
	/** Statut d'expiration ; `null` si le document n'a pas de date d'expiration. */
	validite: ValiditeInfo | null;
}

/** Documents d'un intervenant (+ libellé du type + statut d'expiration), récents d'abord. */
export async function listerDocumentsDe(userId: string): Promise<DocumentView[]> {
	const rows = await db
		.select({
			id: document.id,
			typeId: document.typeId,
			typeLibelle: documentType.libelle,
			nomFichier: document.nomFichier,
			mimeType: document.mimeType,
			taille: document.taille,
			dateExpiration: document.dateExpiration,
			uploadedAt: document.uploadedAt
		})
		.from(document)
		.leftJoin(documentType, eq(document.typeId, documentType.id))
		.where(eq(document.userId, userId))
		.orderBy(desc(document.uploadedAt));

	return rows.map((r) => ({
		...r,
		validite: r.dateExpiration ? statutValidite(r.dateExpiration) : null
	}));
}

/** Ligne brute d'un document (pour téléchargement / suppression). */
export async function getDocument(id: string) {
	return db.select().from(document).where(eq(document.id, id)).get();
}

export interface AjoutDocumentInput {
	userId: string;
	typeId: string | null;
	nomFichier: string;
	mimeType: string;
	dateExpiration: string | null;
	uploadedBy: string;
	data: Buffer | Uint8Array;
}

/** Écrit le fichier sur disque puis enregistre les métadonnées. */
export async function ajouterDocument(input: AjoutDocumentInput): Promise<string> {
	const id = crypto.randomUUID();
	const ext = MIME_AUTORISES[input.mimeType] ?? 'bin';
	const storedName = `${id}.${ext}`;
	await saveFile(input.userId, storedName, input.data);
	await db.insert(document).values({
		id,
		userId: input.userId,
		typeId: input.typeId,
		nomFichier: input.nomFichier,
		storedName,
		mimeType: input.mimeType,
		taille: input.data.byteLength,
		dateExpiration: input.dateExpiration,
		uploadedBy: input.uploadedBy
	});
	return id;
}

export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Traite un formulaire multipart d'upload (champ `file` + `typeId`/`dateExpiration`)
 * pour le compte de `userId`, déposé par `uploadedBy`. Valide type MIME et taille.
 */
export async function traiterUploadForm(
	form: FormData,
	userId: string,
	uploadedBy: string
): Promise<UploadResult> {
	const parsed = documentUploadSchema.safeParse({
		typeId: form.get('typeId'),
		dateExpiration: form.get('dateExpiration')
	});
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? 'Champs invalides' };
	}

	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		return { ok: false, error: 'Aucun fichier sélectionné.' };
	}
	if (file.size > TAILLE_MAX) {
		return { ok: false, error: 'Fichier trop volumineux (max 10 Mo).' };
	}
	if (!estMimeAutorise(file.type)) {
		return { ok: false, error: 'Format non accepté (PDF, JPEG, PNG, WebP ou HEIC).' };
	}

	// Le type doit exister s'il est fourni.
	if (parsed.data.typeId) {
		const t = await db
			.select({ id: documentType.id })
			.from(documentType)
			.where(eq(documentType.id, parsed.data.typeId))
			.get();
		if (!t) return { ok: false, error: 'Type de document inconnu.' };
	}

	const data = Buffer.from(await file.arrayBuffer());
	const id = await ajouterDocument({
		userId,
		typeId: parsed.data.typeId,
		nomFichier: file.name.slice(0, 255),
		mimeType: file.type,
		dateExpiration: parsed.data.dateExpiration,
		uploadedBy,
		data
	});
	return { ok: true, id };
}

/** Supprime la ligne DB puis le fichier disque. */
export async function supprimerDocument(id: string): Promise<void> {
	const doc = await getDocument(id);
	if (!doc) return;
	await db.delete(document).where(eq(document.id, id));
	await deleteFile(doc.userId, doc.storedName);
}

// --- Conformité (documents obligatoires) ---------------------------------

/**
 * État de conformité d'un intervenant vis-à-vis des documents **obligatoires**.
 * Un type s'applique s'il est actif, obligatoire, et que son `niveauRequis` est
 * `null` (tous) ou égal au niveau de l'intervenant.
 */
export async function etatConformite(user: {
	id: string;
	niveau: Niveau | null;
}): Promise<Conformite> {
	const types = await db
		.select()
		.from(documentType)
		.where(and(eq(documentType.actif, true), eq(documentType.obligatoire, true)))
		.orderBy(documentType.ordre, documentType.libelle);

	const applicables = types.filter((t) => !t.niveauRequis || t.niveauRequis === user.niveau);
	if (applicables.length === 0) return { lignes: [], manquants: 0, enAlerte: false };

	const docs = await db
		.select({ typeId: document.typeId, dateExpiration: document.dateExpiration })
		.from(document)
		.where(eq(document.userId, user.id));

	const lignes: ConformiteLigne[] = applicables.map((t) => {
		const desDocs = docs.filter((d) => d.typeId === t.id);
		const { statut, dateExpiration } = statutDocuments(desDocs);
		return { typeId: t.id, libelle: t.libelle, statut, dateExpiration };
	});

	const manquants = lignes.filter((l) => l.statut !== 'present').length;
	return { lignes, manquants, enAlerte: manquants > 0 };
}

/**
 * Conformité **en masse** (liste admin) : nombre de documents obligatoires
 * manquants/expirés par intervenant, calculé en 2 requêtes au total.
 */
export async function conformiteEnMasse(
	users: { id: string; niveau: Niveau | null }[]
): Promise<Map<string, number>> {
	const resultat = new Map<string, number>();
	if (users.length === 0) return resultat;

	const types = await db
		.select()
		.from(documentType)
		.where(and(eq(documentType.actif, true), eq(documentType.obligatoire, true)));
	if (types.length === 0) {
		for (const u of users) resultat.set(u.id, 0);
		return resultat;
	}

	const ids = users.map((u) => u.id);
	const docs = await db
		.select({
			userId: document.userId,
			typeId: document.typeId,
			dateExpiration: document.dateExpiration
		})
		.from(document)
		.where(inArray(document.userId, ids));

	for (const u of users) {
		const applicables = types.filter((t) => !t.niveauRequis || t.niveauRequis === u.niveau);
		const desDocs = docs.filter((d) => d.userId === u.id);
		let manquants = 0;
		for (const t of applicables) {
			const { statut } = statutDocuments(desDocs.filter((d) => d.typeId === t.id));
			if (statut !== 'present') manquants++;
		}
		resultat.set(u.id, manquants);
	}
	return resultat;
}
