import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { besoin, poste, type Niveau } from '../db/schema';
import { parisNowKey, posteKey, dureeHeures } from '../time';

/** Une réservation de l'intervenant (à venir ou passée). */
export interface ReservationView {
	posteId: string;
	niveauRequis: Niveau;
	date: string;
	heureDebut: string;
	heureFin: string;
	commentaire: string | null;
	dureeHeures: number;
}

export interface MesReservations {
	aVenir: ReservationView[];
	passees: ReservationView[];
}

/**
 * Réservations d'un intervenant, séparées **À venir** / **Passées** par l'heure
 * de début (Europe/Paris). Aucune notion d'annulation (CDC §3).
 */
export async function mesReservations(userId: string): Promise<MesReservations> {
	const rows = await db
		.select({
			posteId: poste.id,
			niveauRequis: poste.niveauRequis,
			date: besoin.date,
			heureDebut: besoin.heureDebut,
			heureFin: besoin.heureFin,
			commentaire: besoin.commentaire
		})
		.from(poste)
		.innerJoin(besoin, eq(poste.besoinId, besoin.id))
		.where(eq(poste.reservedBy, userId))
		.orderBy(besoin.date, besoin.heureDebut);

	const now = parisNowKey();
	const aVenir: ReservationView[] = [];
	const passees: ReservationView[] = [];

	for (const r of rows) {
		const view: ReservationView = {
			...r,
			dureeHeures: dureeHeures(r.heureDebut, r.heureFin)
		};
		if (posteKey(r.date, r.heureDebut) > now) aVenir.push(view);
		else passees.push(view);
	}
	// Les passées : plus récentes d'abord.
	passees.reverse();
	return { aVenir, passees };
}

/** Total heures + détail des créneaux comptés, pour un intervalle de dates. */
export interface RecapView {
	total: number;
	lignes: ReservationView[];
}

/**
 * Récap d'heures d'un intervenant (CDC §5) : somme `(heure_fin - heure_debut)`
 * des postes `reserved_by = user` sur des besoins **passés** dans l'intervalle
 * `[from, to]` (dates incluses). Agrégat calculé — **pas de table dédiée**.
 */
export async function recapHeures(
	userId: string,
	from?: string,
	to?: string
): Promise<RecapView> {
	const conditions = [eq(poste.reservedBy, userId)];
	if (from) conditions.push(sql`${besoin.date} >= ${from}`);
	if (to) conditions.push(sql`${besoin.date} <= ${to}`);

	const rows = await db
		.select({
			posteId: poste.id,
			niveauRequis: poste.niveauRequis,
			date: besoin.date,
			heureDebut: besoin.heureDebut,
			heureFin: besoin.heureFin,
			commentaire: besoin.commentaire
		})
		.from(poste)
		.innerJoin(besoin, eq(poste.besoinId, besoin.id))
		.where(sql.join(conditions, sql` AND `))
		.orderBy(besoin.date, besoin.heureDebut);

	const now = parisNowKey();
	const lignes: ReservationView[] = [];
	let total = 0;
	for (const r of rows) {
		// Ne compter que les créneaux passés (terminés).
		if (posteKey(r.date, r.heureFin) > now) continue;
		const d = dureeHeures(r.heureDebut, r.heureFin);
		total += d;
		lignes.push({ ...r, dureeHeures: d });
	}
	return { total, lignes };
}
