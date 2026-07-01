import { requireIntervenant } from '$lib/server/auth/guards';
import { recapHeures } from '$lib/server/services/reservations';
import { toCSV, csvHeaders } from '$lib/server/services/csv';
import { formatDateCourt, formatAmplitude, formatDuree, formatHeure } from '$lib/format';
import { aPause } from '$lib/heures';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);
const dec = (h: number) => h.toFixed(2).replace('.', ',');

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireIntervenant(locals.user);
	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const recap = await recapHeures(user.id, from, to);

	// Deux colonnes distinctes : Amplitude (brut) et Temps de travail effectif (net).
	const rows: (string | number)[][] = [
		[
			'Date',
			'Niveau',
			'Amplitude',
			'Amplitude (h)',
			'Pause',
			'Temps de travail effectif',
			'Effectif (h)',
			'Commentaire'
		]
	];
	let totalAmplitude = 0;
	for (const l of recap.lignes) {
		totalAmplitude += l.amplitude;
		rows.push([
			formatDateCourt(l.date),
			l.niveauRequis,
			`${formatAmplitude(l.heureDebut, l.heureFin)} (${formatDuree(l.amplitude)})`,
			dec(l.amplitude),
			aPause(l.pauseDebut, l.pauseFin)
				? `${formatHeure(l.pauseDebut!)}–${formatHeure(l.pauseFin!)}`
				: '',
			formatDuree(l.effectif),
			dec(l.effectif),
			l.commentaire ?? ''
		]);
	}
	rows.push([]);
	rows.push([
		'Total',
		'',
		formatDuree(totalAmplitude),
		dec(totalAmplitude),
		'',
		formatDuree(recap.total),
		dec(recap.total),
		''
	]);

	const csv = toCSV(rows);
	const suffixe = from || to ? `_${from ?? 'debut'}_${to ?? 'fin'}` : '';
	return new Response(csv, {
		headers: csvHeaders(`recap_${user.nom}_${user.prenom}${suffixe}.csv`)
	});
};
