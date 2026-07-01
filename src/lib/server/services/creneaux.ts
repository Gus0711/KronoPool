import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { besoin, poste, type Niveau } from '../db/schema';
import { parisNowKey, posteKey } from '../time';
import { estEligible, niveauxVisibles } from './eligibilite';

/** Un créneau libre présenté à l'intervenant. */
export interface CreneauView {
	posteId: string;
	besoinId: string;
	niveauRequis: Niveau;
	date: string; // YYYY-MM-DD
	heureDebut: string; // HH:MM
	heureFin: string; // HH:MM
	pauseDebut: string | null; // HH:MM
	pauseFin: string | null; // HH:MM
	commentaire: string | null;
}

/** Expression SQL de la clé chronologique d'un poste (date+heure_debut). */
const debutKey = sql<string>`(${besoin.date} || 'T' || ${besoin.heureDebut})`;

/**
 * Postes **libres, futurs, éligibles** au niveau de l'intervenant (CDC §4.2, handoff).
 * Triés par date puis heure. Le regroupement par jour se fait à l'affichage.
 */
export async function listerCreneaux(niveauUser: Niveau | null): Promise<CreneauView[]> {
	const niveaux = niveauxVisibles(niveauUser);
	if (niveaux.length === 0) return [];

	const now = parisNowKey();
	const rows = await db
		.select({
			posteId: poste.id,
			besoinId: besoin.id,
			niveauRequis: poste.niveauRequis,
			date: besoin.date,
			heureDebut: besoin.heureDebut,
			heureFin: besoin.heureFin,
			pauseDebut: besoin.pauseDebut,
			pauseFin: besoin.pauseFin,
			commentaire: besoin.commentaire
		})
		.from(poste)
		.innerJoin(besoin, eq(poste.besoinId, besoin.id))
		.where(and(isNull(poste.reservedBy), inArray(poste.niveauRequis, niveaux), gt(debutKey, now)))
		.orderBy(besoin.date, besoin.heureDebut, poste.niveauRequis);

	return rows;
}

export type ReservationResult =
	| { ok: true }
	| { ok: false; reason: 'introuvable' | 'ineligible' | 'passe' | 'deja_pris' };

/**
 * Réservation **atomique** « premier arrivé, premier servi » (CDC §9 — point critique).
 *
 * Vérifie **avant** l'UPDATE : éligibilité niveau + poste futur (Europe/Paris).
 * Puis `UPDATE ... WHERE id=? AND reserved_by IS NULL` et contrôle du nombre de
 * lignes affectées : `1` = succès, `0` = déjà réservé. La clause `WHERE reserved_by
 * IS NULL` reste le garde-fou de concurrence même sous course.
 */
export async function reserverPoste(
	userId: string,
	niveauUser: Niveau | null,
	posteId: string
): Promise<ReservationResult> {
	return db.transaction(async (tx) => {
		const p = await tx
			.select({
				niveauRequis: poste.niveauRequis,
				date: besoin.date,
				heureDebut: besoin.heureDebut
			})
			.from(poste)
			.innerJoin(besoin, eq(poste.besoinId, besoin.id))
			.where(eq(poste.id, posteId))
			.get();

		if (!p) return { ok: false, reason: 'introuvable' as const };
		if (!estEligible(niveauUser, p.niveauRequis)) return { ok: false, reason: 'ineligible' as const };
		if (posteKey(p.date, p.heureDebut) <= parisNowKey()) return { ok: false, reason: 'passe' as const };

		const res = await tx
			.update(poste)
			.set({ reservedBy: userId, reservedAt: new Date() })
			.where(and(eq(poste.id, posteId), isNull(poste.reservedBy)));

		return res.rowsAffected === 1
			? { ok: true as const }
			: { ok: false, reason: 'deja_pris' as const };
	});
}
