/**
 * Utilitaires de calendrier (client, purs) pour la vue planning hebdomadaire.
 * Travaille sur des `Date` à midi local pour éviter les décalages de fuseau,
 * et sur des dates métier `YYYY-MM-DD`.
 */

/** `Date` → `YYYY-MM-DD` (composantes locales). */
export function isoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** `YYYY-MM-DD` → `Date` à midi local. */
export function parseISO(s: string): Date {
	const [y, m, d] = s.split('-').map(Number);
	return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}

/** Lundi (00:00 midi) de la semaine contenant `d`. */
export function startOfWeekMonday(d: Date): Date {
	const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
	const dow = (r.getDay() + 6) % 7; // 0 = lundi
	return addDays(r, -dow);
}

/** `HH:MM` → minutes depuis minuit. */
export function minutesOf(hm: string): number {
	const [h, m] = hm.split(':').map(Number);
	return h * 60 + m;
}

/** Libellé mois + année, ex. « juillet 2025 ». */
export function moisAnnee(d: Date): string {
	const s = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Jour court, ex. « lun. ». */
export function jourCourt(d: Date): string {
	return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '');
}

/**
 * Disposition des événements d'une journée avec gestion des chevauchements
 * (packing en colonnes façon Google Agenda). Renvoie pour chaque item sa
 * colonne `col` et le nombre total de colonnes `cols` de son groupe.
 */
export function agencerJournee<T extends { startMin: number; endMin: number }>(
	events: T[]
): (T & { col: number; cols: number })[] {
	const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
	const out: (T & { col: number; cols: number })[] = [];

	let cluster: (T & { col: number; cols: number })[] = [];
	let clusterEnd = -1;

	const flush = () => {
		const colonnesFin: number[] = []; // fin du dernier évènement par colonne
		for (const ev of cluster) {
			let placed = false;
			for (let i = 0; i < colonnesFin.length; i++) {
				if (ev.startMin >= colonnesFin[i]) {
					ev.col = i;
					colonnesFin[i] = ev.endMin;
					placed = true;
					break;
				}
			}
			if (!placed) {
				ev.col = colonnesFin.length;
				colonnesFin.push(ev.endMin);
			}
		}
		const n = colonnesFin.length;
		for (const ev of cluster) {
			ev.cols = n;
			out.push(ev);
		}
		cluster = [];
		clusterEnd = -1;
	};

	for (const ev of sorted) {
		const item = { ...ev, col: 0, cols: 1 };
		if (cluster.length && item.startMin >= clusterEnd) flush();
		cluster.push(item);
		clusterEnd = Math.max(clusterEnd, item.endMin);
	}
	if (cluster.length) flush();
	return out;
}
