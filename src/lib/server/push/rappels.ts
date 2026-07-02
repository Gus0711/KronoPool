import { and, eq, gt, isNotNull, notExists, sql } from 'drizzle-orm';
import { db } from '../db';
import { besoin, poste, rappel, type RappelKind } from '../db/schema';
import { parisNowKey, parisWallToInstant } from '../time';
import { formatJour } from '$lib/format';
import { envoyerAUtilisateurs, pushDisponible } from './webpush';

/** Clé chronologique SQL d'un poste (date + heure de début). */
const debutKey = sql<string>`(${besoin.date} || 'T' || ${besoin.heureDebut})`;

/**
 * Rappels de créneau (Web Push) envoyés aux intervenants qui ont réservé.
 *
 * Deux fenêtres, déclenchées par le planificateur ({@link ../scheduler}) :
 * - `j1` : à moins de ~24 h du début ;
 * - `h2` : à moins de ~2 h du début.
 *
 * Idempotence : chaque (poste, type) n'est envoyé **qu'une fois** (table `rappel`).
 * La sélection est faite en heure murale Europe/Paris convertie en instant réel
 * (DST géré), pour comparer correctement « dans moins de N heures ».
 */

const FENETRES: { kind: RappelKind; avantMs: number; titre: string; corps: (j: string, h: string) => string }[] = [
	{
		kind: 'j1',
		avantMs: 24 * 60 * 60 * 1000,
		titre: 'Rappel : créneau demain',
		corps: (j, h) => `${j} · ${h}`
	},
	{
		kind: 'h2',
		avantMs: 2 * 60 * 60 * 1000,
		titre: 'Rappel : créneau bientôt',
		corps: (j, h) => `Aujourd'hui · ${h}`
	}
];

/**
 * Envoie tous les rappels dus à l'instant de l'appel. Résilient (n'échoue jamais).
 * No-op si le push n'est pas configuré (les rappels ne sont alors **pas** marqués
 * comme envoyés : ils partiront dès que les clés VAPID seront présentes).
 */
export async function envoyerRappelsDus(now = new Date()): Promise<void> {
	if (!pushDisponible()) return;
	try {
		const nowKey = parisNowKey(now);
		for (const f of FENETRES) {
			// Candidats : postes réservés, futurs, pas encore rappelés pour ce type.
			const candidats = await db
				.select({
					posteId: poste.id,
					userId: poste.reservedBy,
					date: besoin.date,
					heureDebut: besoin.heureDebut,
					heureFin: besoin.heureFin,
					commentaire: besoin.commentaire
				})
				.from(poste)
				.innerJoin(besoin, eq(poste.besoinId, besoin.id))
				.where(
					and(
						isNotNull(poste.reservedBy),
						gt(debutKey, nowKey),
						notExists(
							db
								.select({ x: rappel.id })
								.from(rappel)
								.where(and(eq(rappel.posteId, poste.id), eq(rappel.kind, f.kind)))
						)
					)
				);

			for (const c of candidats) {
				if (!c.userId) continue;
				const debut = parisWallToInstant(c.date, c.heureDebut);
				// Fenêtre : le créneau commence dans moins de `avantMs` (et n'est pas passé).
				if (debut.getTime() - now.getTime() > f.avantMs) continue;

				await envoyerAUtilisateurs([c.userId], {
					title: f.titre,
					body: f.corps(formatJour(c.date), `${c.heureDebut}–${c.heureFin}`),
					url: '/mes-reservations',
					tag: `rappel-${f.kind}-${c.posteId}`
				});
				// Marque comme envoyé (idempotence), même sans abonnement actif :
				// évite de re-tenter à chaque tick.
				await db
					.insert(rappel)
					.values({ posteId: c.posteId, kind: f.kind })
					.onConflictDoNothing();
			}
		}
	} catch {
		/* ne jamais faire échouer le planificateur */
	}
}
