/**
 * Décompte du temps de travail d'un créneau — **source de vérité unique** du calcul,
 * réutilisée partout (affichage intervenant, export, récap). Pur & isomorphe.
 *
 *   amplitude = heure_fin − heure_debut
 *   pause     = (pause_debut ET pause_fin renseignés) ? pause_fin − pause_debut : 0
 *   effectif  = amplitude − pause
 *
 * Ex. 08:00→18:00 avec pause 12:30→13:30 = 10 h − 1 h = 9 h.
 *
 * Heures au format `HH:MM` (24 h). Résultats en **heures décimales**.
 */

/** Minutes depuis minuit pour une heure `HH:MM`. */
function minutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

export interface DecompteHeures {
	/** Amplitude brute (heure_fin − heure_debut), en heures décimales. */
	amplitude: number;
	/** Durée de pause déduite, en heures décimales (0 si pas de pause). */
	pause: number;
	/** Temps de travail effectif (amplitude − pause), en heures décimales. */
	effectif: number;
}

/** Vrai si une pause complète (début **et** fin) est renseignée. */
export function aPause(pauseDebut?: string | null, pauseFin?: string | null): boolean {
	return Boolean(pauseDebut && pauseFin);
}

/**
 * Calcule amplitude / pause / effectif pour un créneau.
 * La pause n'est prise en compte que si `pauseDebut` **et** `pauseFin` sont fournis.
 */
export function decompteHeures(
	heureDebut: string,
	heureFin: string,
	pauseDebut?: string | null,
	pauseFin?: string | null
): DecompteHeures {
	const amplitude = (minutes(heureFin) - minutes(heureDebut)) / 60;
	const pause = aPause(pauseDebut, pauseFin)
		? (minutes(pauseFin as string) - minutes(pauseDebut as string)) / 60
		: 0;
	return { amplitude, pause, effectif: amplitude - pause };
}
