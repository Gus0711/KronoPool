import { parisToday } from '../time';

/**
 * Statut d'une date de validité de diplôme (CDC §4.4).
 * `absent` = non renseignée ; `expire` = dépassée ; `bientot` = sous `seuilJours`.
 */
export type StatutValidite = 'absent' | 'expire' | 'bientot' | 'ok';

export interface ValiditeInfo {
	statut: StatutValidite;
	joursRestants: number | null;
}

function joursEntre(aISO: string, bISO: string): number {
	const a = Date.parse(`${aISO}T12:00:00Z`);
	const b = Date.parse(`${bISO}T12:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

export function statutValidite(
	dateISO: string | null,
	today: string = parisToday(),
	seuilJours = 30
): ValiditeInfo {
	if (!dateISO) return { statut: 'absent', joursRestants: null };
	const jours = joursEntre(today, dateISO);
	if (jours < 0) return { statut: 'expire', joursRestants: jours };
	if (jours <= seuilJours) return { statut: 'bientot', joursRestants: jours };
	return { statut: 'ok', joursRestants: jours };
}

/** Un diplôme mérite-t-il une alerte dashboard (expiré ou < 30 j) ? */
export function estEnAlerte(info: ValiditeInfo): boolean {
	return info.statut === 'expire' || info.statut === 'bientot';
}
