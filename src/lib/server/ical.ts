import { parisWallToInstant } from './time';
import type { CreneauCalendrier } from './services/reservations';

/**
 * Génération d'un flux **iCalendar** (RFC 5545) pour l'abonnement calendrier d'un
 * intervenant. Les créneaux (heure murale Europe/Paris) sont convertis en instants
 * **UTC** (suffixe `Z`) : sans ambiguïté, pas de VTIMEZONE à embarquer.
 */

const p2 = (n: number) => String(n).padStart(2, '0');

/** Instant → estampille UTC iCal `YYYYMMDDTHHMMSSZ`. */
function stampUtc(d: Date): string {
	return (
		`${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}` +
		`T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`
	);
}

/** Échappe une valeur texte iCal (`\`, `;`, `,`, retours ligne). */
function esc(v: string): string {
	return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Repli des lignes > 75 octets (RFC 5545) : continuation par espace. */
function fold(line: string): string {
	if (line.length <= 75) return line;
	const parts: string[] = [];
	let rest = line;
	parts.push(rest.slice(0, 75));
	rest = rest.slice(75);
	while (rest.length > 74) {
		parts.push(' ' + rest.slice(0, 74));
		rest = rest.slice(74);
	}
	if (rest.length) parts.push(' ' + rest);
	return parts.join('\r\n');
}

/**
 * Construit le document iCal. `now` sert de `DTSTAMP` (passé explicitement pour
 * rester testable / déterministe).
 */
export function construireIcal(
	creneaux: CreneauCalendrier[],
	now: Date,
	nomCalendrier = 'KronoPool — mes créneaux'
): string {
	const dtstamp = stampUtc(now);
	const lignes: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//KronoPool//Planning piscine//FR',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${esc(nomCalendrier)}`,
		'X-WR-TIMEZONE:Europe/Paris'
	];

	for (const c of creneaux) {
		const debut = parisWallToInstant(c.date, c.heureDebut);
		const fin = parisWallToInstant(c.date, c.heureFin);
		const titre = `Surveillance piscine (${c.niveauRequis})`;
		lignes.push(
			'BEGIN:VEVENT',
			`UID:poste-${c.posteId}@kronopool`,
			`DTSTAMP:${dtstamp}`,
			`DTSTART:${stampUtc(debut)}`,
			`DTEND:${stampUtc(fin)}`,
			`SUMMARY:${esc(titre)}`
		);
		if (c.commentaire) lignes.push(`DESCRIPTION:${esc(c.commentaire)}`);
		lignes.push('END:VEVENT');
	}

	lignes.push('END:VCALENDAR');
	return lignes.map(fold).join('\r\n') + '\r\n';
}
