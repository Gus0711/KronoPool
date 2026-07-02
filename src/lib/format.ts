/**
 * Formatage d'affichage (français, Europe/Paris). Pur & isomorphe (client + serveur).
 */

import { decompteHeures, aPause } from '$lib/heures';

/** `2025-07-05` → `Samedi 5 juillet` (première lettre capitalisée). */
export function formatJour(dateISO: string): string {
	const d = new Date(`${dateISO}T12:00:00`);
	const s = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(d);
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** `2025-07-05` → `05/07/2025`. */
export function formatDateCourt(dateISO: string): string {
	const d = new Date(`${dateISO}T12:00:00`);
	return new Intl.DateTimeFormat('fr-FR').format(d);
}

/** `09:00`, `13:00` → `09:00 – 13:00`. */
export function formatPlage(heureDebut: string, heureFin: string): string {
	return `${heureDebut} – ${heureFin}`;
}

/** Heures décimales → `4 h`, `3 h 30`. */
export function formatDuree(heures: number): string {
	const totalMin = Math.round(heures * 60);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** `09:00` → `09h00` (style horaire français). */
export function formatHeure(hhmm: string): string {
	return hhmm.replace(':', 'h');
}

/** `08:00`, `18:00` → `08h00–18h00` (amplitude affichée). */
export function formatAmplitude(heureDebut: string, heureFin: string): string {
	return `${formatHeure(heureDebut)}–${formatHeure(heureFin)}`;
}

/**
 * Ligne descriptive du temps de travail d'un créneau (source unique : {@link decompteHeures}).
 * - avec pause : `Pause : 12h30–13h30, soit 9 h de travail effectif`
 * - sans pause : `10 h`
 */
export function formatEffectif(
	heureDebut: string,
	heureFin: string,
	pauseDebut?: string | null,
	pauseFin?: string | null
): string {
	const { amplitude, effectif } = decompteHeures(heureDebut, heureFin, pauseDebut, pauseFin);
	if (aPause(pauseDebut, pauseFin)) {
		return `Pause : ${formatHeure(pauseDebut as string)}–${formatHeure(
			pauseFin as string
		)}, soit ${formatDuree(effectif)} de travail effectif`;
	}
	return formatDuree(amplitude);
}

/**
 * Représentation complète sur une ligne (ex. affichage intervenant, exports) :
 * - avec pause : `08h00–18h00 (Pause : 12h30–13h30, soit 9 h de travail effectif)`
 * - sans pause : `08h00–18h00 (10 h)`
 */
export function formatCreneauComplet(
	heureDebut: string,
	heureFin: string,
	pauseDebut?: string | null,
	pauseFin?: string | null
): string {
	return `${formatAmplitude(heureDebut, heureFin)} (${formatEffectif(
		heureDebut,
		heureFin,
		pauseDebut,
		pauseFin
	)})`;
}

/** Initiales à partir de prénom/nom (avatar). */
export function initiales(prenom: string, nom: string): string {
	return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

/** Taille de fichier lisible (`2,3 Mo`, `512 Ko`, `48 o`). */
export function formatTaille(octets: number): string {
	if (octets < 1024) return `${octets} o`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
