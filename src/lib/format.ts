/**
 * Formatage d'affichage (français, Europe/Paris). Pur & isomorphe (client + serveur).
 */

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

/** Initiales à partir de prénom/nom (avatar). */
export function initiales(prenom: string, nom: string): string {
	return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}
