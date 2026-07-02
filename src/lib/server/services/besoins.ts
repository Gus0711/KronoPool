import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { auditLog, besoin, poste, user, type Niveau } from '../db/schema';
import { parisNowKey, posteKey } from '../time';
import { estEligible } from './eligibilite';

export type StatutBesoin = 'avenir' | 'complet' | 'passe';

export interface BesoinResume {
	id: string;
	date: string;
	heureDebut: string;
	heureFin: string;
	pauseDebut: string | null;
	pauseFin: string | null;
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
		pauseDebut: string | null;
		pauseFin: string | null;
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
			pauseDebut: data.pauseDebut,
			pauseFin: data.pauseFin,
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
			pauseDebut: besoin.pauseDebut,
			pauseFin: besoin.pauseFin,
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
		pauseDebut: b.pauseDebut,
		pauseFin: b.pauseFin,
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

const NIVEAU_LABEL: Record<Niveau, string> = { MNS: 'MNS', BNSSA: 'BNSSA' };

/**
 * Modifie un besoin : entête (date/heures/commentaire) **et** ajuste le nombre de
 * postes par niveau. Augmenter le nombre ajoute des postes libres ; le réduire
 * supprime des postes **libres** uniquement. On ne peut jamais descendre sous le
 * nombre de postes déjà réservés (il faut d'abord les libérer). Tout se fait dans
 * une transaction : en cas de refus, aucune modification n'est appliquée.
 */
export async function modifierBesoin(
	id: string,
	data: {
		date: string;
		heureDebut: string;
		heureFin: string;
		pauseDebut: string | null;
		pauseFin: string | null;
		commentaire: string | null;
		nbMns: number;
		nbBnssa: number;
	}
): Promise<{ ok: true } | { ok: false; error: string }> {
	return db.transaction(async (tx) => {
		const rows = await tx.select().from(poste).where(eq(poste.besoinId, id));

		const cibles: Record<Niveau, number> = { MNS: data.nbMns, BNSSA: data.nbBnssa };
		const aAjouter: { besoinId: string; niveauRequis: Niveau }[] = [];
		const aSupprimer: string[] = [];

		for (const niveau of ['MNS', 'BNSSA'] as const) {
			const cible = cibles[niveau];
			const groupe = rows.filter((r) => r.niveauRequis === niveau);
			const reserves = groupe.filter((r) => r.reservedBy).length;

			// Refus si on tente de descendre sous les postes déjà réservés.
			if (cible < reserves) {
				return {
					ok: false as const,
					error: `Impossible de réduire à ${cible} poste(s) ${NIVEAU_LABEL[niveau]} : ${reserves} déjà réservé(s). Libérez d'abord les postes concernés.`
				};
			}

			if (cible > groupe.length) {
				for (let i = 0; i < cible - groupe.length; i++)
					aAjouter.push({ besoinId: id, niveauRequis: niveau });
			} else if (cible < groupe.length) {
				const libres = groupe.filter((r) => !r.reservedBy).map((r) => r.id);
				aSupprimer.push(...libres.slice(0, groupe.length - cible));
			}
		}

		if (aAjouter.length > 0) await tx.insert(poste).values(aAjouter);
		if (aSupprimer.length > 0) await tx.delete(poste).where(inArray(poste.id, aSupprimer));

		await tx
			.update(besoin)
			.set({
				date: data.date,
				heureDebut: data.heureDebut,
				heureFin: data.heureFin,
				pauseDebut: data.pauseDebut,
				pauseFin: data.pauseFin,
				commentaire: data.commentaire,
				updatedAt: new Date()
			})
			.where(eq(besoin.id, id));

		return { ok: true as const };
	});
}

export type SuppressionBesoinResult = { ok: true } | { ok: false; reason: 'passe_avec_reservations' };

/**
 * Supprime un besoin (CASCADE sur les postes). **Refuse** de supprimer un besoin
 * déjà **passé** qui porte au moins une réservation : il constitue l'historique
 * des interventions (heures effectuées) et ne doit pas être effacé
 * rétroactivement. Un besoin futur reste supprimable (confirmation côté UI) ;
 * pour retirer un poste passé, l'admin doit d'abord le **libérer**.
 */
export async function supprimerBesoin(id: string): Promise<SuppressionBesoinResult> {
	return db.transaction(async (tx) => {
		const b = await tx.select().from(besoin).where(eq(besoin.id, id)).get();
		if (!b) return { ok: true }; // déjà supprimé — idempotent
		const postes = await tx.select().from(poste).where(eq(poste.besoinId, id));
		const aReservations = postes.some((p) => p.reservedBy);
		const estPasse = posteKey(b.date, b.heureFin) <= parisNowKey();
		if (estPasse && aReservations) return { ok: false, reason: 'passe_avec_reservations' };
		await tx.delete(besoin).where(eq(besoin.id, id));
		return { ok: true };
	});
}

/**
 * Supprime un **poste** individuel — uniquement s'il est **libre**. Un poste
 * réservé doit d'abord être libéré (CDC : pas de suppression silencieuse d'une
 * réservation).
 * @returns `true` si un poste libre a bien été supprimé.
 */
export async function supprimerPoste(posteId: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const p = await tx.select().from(poste).where(eq(poste.id, posteId)).get();
		if (!p || p.reservedBy) return false;
		await tx.delete(poste).where(eq(poste.id, posteId));
		return true;
	});
}

export type AssignationResult =
	| { ok: true }
	| {
			ok: false;
			reason: 'introuvable' | 'intervenant_invalide' | 'ineligible' | 'deja_pris' | 'deja_sur_besoin';
	  };

/**
 * **Assigne** manuellement un intervenant à un poste libre (admin, CDC §6.2).
 *
 * Contrôles **avant** l'UPDATE : intervenant existant, actif, de rôle `intervenant`,
 * et **éligible** au niveau du poste (poste MNS → MNS uniquement ; poste BNSSA →
 * MNS ou BNSSA). L'écriture garde le verrou de concurrence `WHERE reserved_by IS
 * NULL` : `rowsAffected = 0` ⇒ le poste vient d'être pris. Tracé dans `audit_log`.
 *
 * Contrairement à la réservation intervenant, l'admin peut assigner un poste
 * **passé** (saisie a posteriori de qui a couvert le créneau).
 */
export async function assignerPoste(
	adminId: string,
	posteId: string,
	intervenantId: string
): Promise<AssignationResult> {
	return db.transaction(async (tx) => {
		const p = await tx.select().from(poste).where(eq(poste.id, posteId)).get();
		if (!p) return { ok: false, reason: 'introuvable' as const };
		if (p.reservedBy) return { ok: false, reason: 'deja_pris' as const };

		const u = await tx.select().from(user).where(eq(user.id, intervenantId)).get();
		if (!u || u.role !== 'intervenant' || !u.actif) {
			return { ok: false, reason: 'intervenant_invalide' as const };
		}
		if (!estEligible(u.niveau, p.niveauRequis)) {
			return { ok: false, reason: 'ineligible' as const };
		}

		// Un intervenant ne peut pas occuper deux postes du même besoin.
		const dejaSurBesoin = await tx
			.select({ id: poste.id })
			.from(poste)
			.where(and(eq(poste.besoinId, p.besoinId), eq(poste.reservedBy, intervenantId)))
			.get();
		if (dejaSurBesoin) return { ok: false, reason: 'deja_sur_besoin' as const };

		const res = await tx
			.update(poste)
			.set({ reservedBy: intervenantId, reservedAt: new Date() })
			.where(and(eq(poste.id, posteId), isNull(poste.reservedBy)));
		if (res.rowsAffected !== 1) return { ok: false, reason: 'deja_pris' as const };

		await tx.insert(auditLog).values({
			posteId,
			action: 'assignation',
			ancienIntervenant: intervenantId,
			adminId
		});
		return { ok: true as const };
	});
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
