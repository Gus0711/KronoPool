import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { besoin, poste, user, type Niveau } from '../db/schema';
import { parisNowKey, posteKey } from '../time';
import { estEligible } from '../services/eligibilite';
import { formatJour } from '$lib/format';
import { envoyerAUtilisateurs } from './webpush';

/**
 * Notifications métier (événementielles). Chaque fonction est **résiliente** :
 * elle n'échoue jamais (try/catch interne) et est appelée sans `await` depuis les
 * form actions (`void notifier…()`) pour ne pas ralentir la réponse.
 */

/** Niveaux d'intervenant éligibles à au moins un poste de la liste donnée. */
function niveauxCibles(posteNiveaux: Niveau[]): Niveau[] {
	const set = new Set<Niveau>();
	for (const pn of posteNiveaux) {
		for (const un of ['MNS', 'BNSSA'] as const) {
			if (estEligible(un, pn)) set.add(un);
		}
	}
	return [...set];
}

async function intervenantsActifsDeNiveaux(niveaux: Niveau[]): Promise<string[]> {
	if (niveaux.length === 0) return [];
	const rows = await db
		.select({ id: user.id })
		.from(user)
		.where(and(eq(user.role, 'intervenant'), eq(user.actif, true), inArray(user.niveau, niveaux)));
	return rows.map((r) => r.id);
}

function amplitude(hd: string, hf: string, com: string | null): string {
	return `${hd}–${hf}${com ? ` · ${com}` : ''}`;
}

/** Nouveau besoin publié → intervenants éligibles (par niveau des postes). */
export async function notifierNouveauBesoin(besoinId: string): Promise<void> {
	try {
		const b = await db.select().from(besoin).where(eq(besoin.id, besoinId)).get();
		if (!b) return;
		// Pas de notif pour un besoin déjà passé (saisie a posteriori).
		if (posteKey(b.date, b.heureDebut) <= parisNowKey()) return;

		const postes = await db
			.select({ niveau: poste.niveauRequis })
			.from(poste)
			.where(eq(poste.besoinId, besoinId));
		if (postes.length === 0) return;

		const ids = await intervenantsActifsDeNiveaux(niveauxCibles(postes.map((p) => p.niveau)));
		await envoyerAUtilisateurs(ids, {
			title: 'Nouveau créneau à pourvoir',
			body: `${formatJour(b.date)} · ${amplitude(b.heureDebut, b.heureFin, b.commentaire)}`,
			url: '/creneaux',
			tag: `besoin-${besoinId}`
		});
	} catch {
		/* ne jamais bloquer l'action */
	}
}

/** Poste libéré par l'admin → intervenants éligibles (le créneau se rouvre). */
export async function notifierPosteLibere(posteId: string): Promise<void> {
	try {
		const row = await db
			.select({
				niveau: poste.niveauRequis,
				date: besoin.date,
				heureDebut: besoin.heureDebut,
				heureFin: besoin.heureFin,
				commentaire: besoin.commentaire
			})
			.from(poste)
			.innerJoin(besoin, eq(poste.besoinId, besoin.id))
			.where(eq(poste.id, posteId))
			.get();
		if (!row) return;
		if (posteKey(row.date, row.heureDebut) <= parisNowKey()) return;

		const ids = await intervenantsActifsDeNiveaux(niveauxCibles([row.niveau]));
		await envoyerAUtilisateurs(ids, {
			title: 'Un créneau se rouvre',
			body: `${formatJour(row.date)} · ${amplitude(row.heureDebut, row.heureFin, row.commentaire)}`,
			url: '/creneaux',
			tag: `poste-${posteId}`
		});
	} catch {
		/* ne jamais bloquer l'action */
	}
}

/** Réservation d'un poste → notifie les administrateurs (suivi du remplissage). */
export async function notifierReservationAuxAdmins(
	posteId: string,
	intervenantId: string
): Promise<void> {
	try {
		const row = await db
			.select({
				besoinId: poste.besoinId,
				date: besoin.date,
				heureDebut: besoin.heureDebut,
				heureFin: besoin.heureFin
			})
			.from(poste)
			.innerJoin(besoin, eq(poste.besoinId, besoin.id))
			.where(eq(poste.id, posteId))
			.get();
		if (!row) return;

		const it = await db
			.select({ nom: user.nom, prenom: user.prenom })
			.from(user)
			.where(eq(user.id, intervenantId))
			.get();
		const admins = await db
			.select({ id: user.id })
			.from(user)
			.where(and(eq(user.role, 'admin'), eq(user.actif, true)));

		await envoyerAUtilisateurs(
			admins.map((a) => a.id),
			{
				title: 'Créneau réservé',
				body: `${it ? `${it.prenom} ${it.nom}` : 'Un intervenant'} a réservé le ${formatJour(row.date)} · ${row.heureDebut}–${row.heureFin}`,
				url: `/besoins/${row.besoinId}`,
				tag: `resa-${posteId}`
			}
		);
	} catch {
		/* ne jamais bloquer l'action */
	}
}
