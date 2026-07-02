import { parseISO, addDays, isoDate } from './calendar';

/** Plafond de sécurité du nombre d'occurrences générées en une fois. */
export const MAX_OCCURRENCES = 52;

/** Libellés des jours (convention `Date.getDay()` : 0 = dimanche … 6 = samedi). */
export const JOURS_SEMAINE: { valeur: number; court: string; long: string }[] = [
	{ valeur: 1, court: 'Lun', long: 'Lundi' },
	{ valeur: 2, court: 'Mar', long: 'Mardi' },
	{ valeur: 3, court: 'Mer', long: 'Mercredi' },
	{ valeur: 4, court: 'Jeu', long: 'Jeudi' },
	{ valeur: 5, court: 'Ven', long: 'Vendredi' },
	{ valeur: 6, court: 'Sam', long: 'Samedi' },
	{ valeur: 0, court: 'Dim', long: 'Dimanche' }
];

/**
 * Énumère les dates `YYYY-MM-DD` d'une récurrence **hebdomadaire** : tous les jours
 * de la semaine listés dans `jours` (0 = dimanche … 6 = samedi, convention
 * `Date.getDay()`), entre `from` et `to` **inclus**. Plafonné à `max` occurrences.
 * Fonction pure (dates locales à midi) — pas de dépendance à l'heure courante.
 */
export function occurrencesHebdo(
	jours: number[],
	from: string,
	to: string,
	max = MAX_OCCURRENCES
): string[] {
	const cibles = new Set(jours);
	const out: string[] = [];
	const fin = parseISO(to).getTime();
	let d = parseISO(from);
	while (d.getTime() <= fin && out.length < max) {
		if (cibles.has(d.getDay())) out.push(isoDate(d));
		d = addDays(d, 1);
	}
	return out;
}
