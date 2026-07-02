/**
 * Utilitaires de temps — fuseau **Europe/Paris** (source de vérité comportement, CDC §4.2/§9).
 *
 * Les besoins sont stockés en heure locale « murale » (date `YYYY-MM-DD` + heure `HH:MM`).
 * Pour décider si un poste est **futur**, on compare une clé lexicographique
 * `YYYY-MM-DDTHH:MM` (largeur fixe → l'ordre lexical = l'ordre chronologique)
 * au « maintenant » exprimé dans le même fuseau.
 */

const TZ = 'Europe/Paris';

/** Parts date/heure de « maintenant » dans le fuseau Europe/Paris. */
function parisParts(date = new Date()): Record<string, string> {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
	const parts: Record<string, string> = {};
	for (const p of fmt.formatToParts(date)) {
		if (p.type !== 'literal') parts[p.type] = p.value;
	}
	// `en-CA` rend l'heure 24h ; garde-fou pour « 24 » à minuit.
	if (parts.hour === '24') parts.hour = '00';
	return parts;
}

/** Date du jour à Paris, format `YYYY-MM-DD`. */
export function parisToday(date = new Date()): string {
	const p = parisParts(date);
	return `${p.year}-${p.month}-${p.day}`;
}

/** Heure courante à Paris, format `HH:MM`. */
export function parisNowHM(date = new Date()): string {
	const p = parisParts(date);
	return `${p.hour}:${p.minute}`;
}

/**
 * Clé chronologique « maintenant » à Paris : `YYYY-MM-DDTHH:MM`.
 * À comparer (`>`) avec {@link posteKey} pour savoir si un poste est futur.
 */
export function parisNowKey(date = new Date()): string {
	return `${parisToday(date)}T${parisNowHM(date)}`;
}

/** Clé chronologique d'un poste à partir de la date du besoin + heure de début. */
export function posteKey(date: string, heureDebut: string): string {
	return `${date}T${heureDebut}`;
}

/** Parts (nombres) de l'heure murale affichée à Paris pour un instant donné. */
function parisPartsNum(instant: Date) {
	const p = parisParts(instant);
	return {
		y: Number(p.year),
		mo: Number(p.month),
		d: Number(p.day),
		h: Number(p.hour === '24' ? '00' : p.hour),
		mi: Number(p.minute)
	};
}

/**
 * Convertit une heure **murale Europe/Paris** (`YYYY-MM-DD` + `HH:MM`) en instant
 * UTC (`Date`). Gère l'heure d'été/hiver via l'offset réel du fuseau à cette date.
 * Méthode standard en deux passes ; les rares heures ambiguës/inexistantes du
 * changement d'heure sont approximées (acceptable pour des créneaux de piscine).
 */
export function parisWallToInstant(date: string, hm: string): Date {
	const [y, mo, d] = date.split('-').map(Number);
	const [h, mi] = hm.split(':').map(Number);
	const guess = Date.UTC(y, mo - 1, d, h, mi);
	const wall = parisPartsNum(new Date(guess));
	const asUtc = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi);
	const offset = asUtc - guess; // ms dont Paris est en avance sur UTC à cet instant
	return new Date(guess - offset);
}

/**
 * Durée en heures (décimal) entre deux heures `HH:MM`.
 * Utilisé pour le récap (somme heure_fin - heure_debut).
 */
export function dureeHeures(heureDebut: string, heureFin: string): number {
	const [dh, dm] = heureDebut.split(':').map(Number);
	const [fh, fm] = heureFin.split(':').map(Number);
	return (fh * 60 + fm - (dh * 60 + dm)) / 60;
}
