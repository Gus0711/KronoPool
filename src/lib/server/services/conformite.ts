import { statutValidite, type StatutValidite } from './diplomes';

/**
 * Logique **pure** de conformité documentaire (sans DB / stockage / $env) —
 * isolée ici pour être testable et importable côté client (types).
 */

/** MIME acceptés → extension de stockage. */
export const MIME_AUTORISES: Record<string, string> = {
	'application/pdf': 'pdf',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/heic': 'heic',
	'image/heif': 'heif'
};

/** Taille maximale d'un document (10 Mo). */
export const TAILLE_MAX = 10 * 1024 * 1024;

export function estMimeAutorise(mime: string): boolean {
	return mime in MIME_AUTORISES;
}

/** `present` = au moins un document valide ; `expire` = tous expirés ; `manquant` = aucun. */
export type StatutConformite = 'present' | 'expire' | 'manquant';

export interface ConformiteLigne {
	typeId: string;
	libelle: string;
	statut: StatutConformite;
	/** Date d'expiration du document retenu (le plus pertinent), si applicable. */
	dateExpiration: string | null;
}

export interface Conformite {
	lignes: ConformiteLigne[];
	/** Nombre de types obligatoires non satisfaits (manquant ou expiré). */
	manquants: number;
	enAlerte: boolean;
}

/**
 * Statut de conformité pour un ensemble de documents d'un même type.
 * `manquant` si aucun, `present` si ≥1 valide (« le plus récent non expiré fait
 * foi »), `expire` si tous expirés.
 */
export function statutDocuments(docs: { dateExpiration: string | null }[]): {
	statut: StatutConformite;
	dateExpiration: string | null;
} {
	if (docs.length === 0) return { statut: 'manquant', dateExpiration: null };
	// Un document est valide s'il n'a pas d'expiration ou n'est pas expiré.
	const valides = docs.filter(
		(d) => !d.dateExpiration || statutValidite(d.dateExpiration).statut !== 'expire'
	);
	if (valides.length > 0) {
		// Parmi les valides, on retient l'expiration la plus lointaine (permanent = null l'emporte).
		const permanent = valides.find((d) => !d.dateExpiration);
		const date = permanent
			? null
			: valides.map((d) => d.dateExpiration!).sort((a, b) => b.localeCompare(a))[0];
		return { statut: 'present', dateExpiration: date };
	}
	// Tous expirés : on remonte l'expiration la plus récente.
	const date = docs
		.map((d) => d.dateExpiration)
		.filter((d): d is string => !!d)
		.sort((a, b) => b.localeCompare(a))[0];
	return { statut: 'expire', dateExpiration: date ?? null };
}

/** Vers le composant ValiditePill : statut de conformité → statut de validité. */
export function conformiteVersValidite(l: ConformiteLigne): {
	date: string | null;
	statut: StatutValidite;
} {
	if (l.statut === 'manquant') return { date: null, statut: 'absent' };
	if (l.statut === 'expire') return { date: l.dateExpiration, statut: 'expire' };
	return { date: l.dateExpiration, statut: 'ok' };
}
