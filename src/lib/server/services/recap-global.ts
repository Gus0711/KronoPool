import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { besoin, poste, user } from '../db/schema';
import { parisNowKey, posteKey } from '../time';
import { decompteHeures } from '$lib/heures';

export interface LigneRecapGlobal {
	intervenantId: string;
	nom: string;
	prenom: string;
	niveau: string | null;
	nbCreneaux: number;
	/** Amplitude brute cumulée (pauses **incluses**), heures décimales. */
	amplitudeHeures: number;
	/** Temps de travail effectif cumulé (pauses **déduites**) — total du récap. */
	totalHeures: number;
}

/**
 * Récap d'heures **global** par intervenant sur un intervalle (CDC §6.2).
 * Agrège les postes réservés sur des besoins **passés** (terminés) dans `[from, to]`.
 */
export async function recapGlobal(from?: string, to?: string): Promise<LigneRecapGlobal[]> {
	const conditions = [isNotNull(poste.reservedBy)];
	if (from) conditions.push(sql`${besoin.date} >= ${from}`);
	if (to) conditions.push(sql`${besoin.date} <= ${to}`);

	const rows = await db
		.select({
			intervenantId: poste.reservedBy,
			nom: user.nom,
			prenom: user.prenom,
			niveau: user.niveau,
			date: besoin.date,
			heureDebut: besoin.heureDebut,
			heureFin: besoin.heureFin,
			pauseDebut: besoin.pauseDebut,
			pauseFin: besoin.pauseFin
		})
		.from(poste)
		.innerJoin(besoin, eq(poste.besoinId, besoin.id))
		.innerJoin(user, eq(poste.reservedBy, user.id))
		.where(and(...conditions))
		.orderBy(user.nom, user.prenom);

	const now = parisNowKey();
	const map = new Map<string, LigneRecapGlobal>();
	for (const r of rows) {
		if (!r.intervenantId) continue;
		if (posteKey(r.date, r.heureFin) > now) continue; // uniquement les créneaux terminés
		const entry =
			map.get(r.intervenantId) ??
			({
				intervenantId: r.intervenantId,
				nom: r.nom,
				prenom: r.prenom,
				niveau: r.niveau,
				nbCreneaux: 0,
				amplitudeHeures: 0,
				totalHeures: 0
			} satisfies LigneRecapGlobal);
		const { amplitude, effectif } = decompteHeures(
			r.heureDebut,
			r.heureFin,
			r.pauseDebut,
			r.pauseFin
		);
		entry.nbCreneaux += 1;
		entry.amplitudeHeures += amplitude;
		entry.totalHeures += effectif;
		map.set(r.intervenantId, entry);
	}
	return [...map.values()];
}
