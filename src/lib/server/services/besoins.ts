import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { auditLog, besoin, poste, user, type Niveau } from '../db/schema';
import { parisNowKey, posteKey } from '../time';

export type StatutBesoin = 'avenir' | 'complet' | 'passe';

export interface BesoinResume {
	id: string;
	date: string;
	heureDebut: string;
	heureFin: string;
	commentaire: string | null;
	total: number;
	pourvus: number;
	statut: StatutBesoin;
}

/** Statut **calculé** d'un besoin (CDC §4.3) — jamais stocké. */
function calcStatut(
	date: string,
	heureFin: string,
	total: number,
	pourvus: number
): StatutBesoin {
	if (posteKey(date, heureFin) <= parisNowKey()) return 'passe';
	if (total > 0 && pourvus >= total) return 'complet';
	return 'avenir';
}

/**
 * Création d'un besoin + **génération des postes** (CDC §4.3) : `nbMns` lignes MNS
 * et `nbBnssa` lignes BNSSA, dans une transaction.
 */
export async function creerBesoin(
	adminId: string,
	data: {
		date: string;
		heureDebut: string;
		heureFin: string;
		commentaire: string | null;
		nbMns: number;
		nbBnssa: number;
	}
): Promise<string> {
	return db.transaction(async (tx) => {
		const id = crypto.randomUUID();
		await tx.insert(besoin).values({
			id,
			date: data.date,
			heureDebut: data.heureDebut,
			heureFin: data.heureFin,
			commentaire: data.commentaire,
			createdBy: adminId
		});

		const postes: { besoinId: string; niveauRequis: Niveau }[] = [];
		for (let i = 0; i < data.nbMns; i++) postes.push({ besoinId: id, niveauRequis: 'MNS' });
		for (let i = 0; i < data.nbBnssa; i++) postes.push({ besoinId: id, niveauRequis: 'BNSSA' });
		if (postes.length > 0) await tx.insert(poste).values(postes);

		return id;
	});
}

/** Liste des besoins avec remplissage + statut, séparés À venir / Passés. */
export async function listerBesoins(): Promise<{ aVenir: BesoinResume[]; passes: BesoinResume[] }> {
	const rows = await db
		.select({
			id: besoin.id,
			date: besoin.date,
			heureDebut: besoin.heureDebut,
			heureFin: besoin.heureFin,
			commentaire: besoin.commentaire,
			total: sql<number>`count(${poste.id})`,
			pourvus: sql<number>`count(${poste.reservedBy})`
		})
		.from(besoin)
		.leftJoin(poste, eq(poste.besoinId, besoin.id))
		.groupBy(besoin.id)
		.orderBy(besoin.date, besoin.heureDebut);

	const aVenir: BesoinResume[] = [];
	const passes: BesoinResume[] = [];
	for (const r of rows) {
		const statut = calcStatut(r.date, r.heureFin, r.total, r.pourvus);
		const resume: BesoinResume = { ...r, statut };
		if (statut === 'passe') passes.push(resume);
		else aVenir.push(resume);
	}
	passes.reverse();
	return { aVenir, passes };
}

export interface PosteDetail {
	id: string;
	niveauRequis: Niveau;
	reservedBy: string | null;
	reservedAt: Date | null;
	intervenant: { nom: string; prenom: string; telephone: string | null } | null;
}

export interface BesoinDetail extends BesoinResume {
	postes: PosteDetail[];
}

/** Détail d'un besoin : postes + intervenant assigné (CDC §6.2). */
export async function detailBesoin(id: string): Promise<BesoinDetail | null> {
	const b = await db.select().from(besoin).where(eq(besoin.id, id)).get();
	if (!b) return null;

	const rows = await db
		.select({
			id: poste.id,
			niveauRequis: poste.niveauRequis,
			reservedBy: poste.reservedBy,
			reservedAt: poste.reservedAt,
			nom: user.nom,
			prenom: user.prenom,
			telephone: user.telephone
		})
		.from(poste)
		.leftJoin(user, eq(poste.reservedBy, user.id))
		.where(eq(poste.besoinId, id))
		.orderBy(poste.niveauRequis);

	const postes: PosteDetail[] = rows.map((r) => ({
		id: r.id,
		niveauRequis: r.niveauRequis,
		reservedBy: r.reservedBy,
		reservedAt: r.reservedAt,
		intervenant: r.reservedBy ? { nom: r.nom!, prenom: r.prenom!, telephone: r.telephone } : null
	}));

	const total = postes.length;
	const pourvus = postes.filter((p) => p.reservedBy).length;
	return {
		id: b.id,
		date: b.date,
		heureDebut: b.heureDebut,
		heureFin: b.heureFin,
		commentaire: b.commentaire,
		total,
		pourvus,
		statut: calcStatut(b.date, b.heureFin, total, pourvus),
		postes
	};
}

/** Nombre de postes réservés d'un besoin (confirmation avant suppression). */
export async function compterReservations(besoinId: string): Promise<number> {
	const r = await db
		.select({ n: sql<number>`count(*)` })
		.from(poste)
		.where(and(eq(poste.besoinId, besoinId), isNotNull(poste.reservedBy)))
		.get();
	return r?.n ?? 0;
}

/** Modifie l'entête d'un besoin (date/heures/commentaire). */
export async function modifierBesoin(
	id: string,
	data: { date: string; heureDebut: string; heureFin: string; commentaire: string | null }
): Promise<void> {
	await db
		.update(besoin)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(besoin.id, id));
}

/** Supprime un besoin (CASCADE sur les postes). */
export async function supprimerBesoin(id: string): Promise<void> {
	await db.delete(besoin).where(eq(besoin.id, id));
}

/**
 * **Libère** un poste réservé (admin uniquement, CDC §6.2) : remet `reserved_by`
 * à `null` et trace l'opération dans `audit_log`.
 * @returns `true` si un poste réservé a bien été libéré.
 */
export async function libererPoste(adminId: string, posteId: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const p = await tx.select().from(poste).where(eq(poste.id, posteId)).get();
		if (!p || !p.reservedBy) return false;

		await tx.insert(auditLog).values({
			posteId,
			action: 'liberation',
			ancienIntervenant: p.reservedBy,
			adminId
		});
		await tx
			.update(poste)
			.set({ reservedBy: null, reservedAt: null })
			.where(eq(poste.id, posteId));
		return true;
	});
}
