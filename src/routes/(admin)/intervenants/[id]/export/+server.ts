import { error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards';
import { getIntervenant } from '$lib/server/services/intervenants';
import { recapHeures } from '$lib/server/services/reservations';
import { toCSV, csvHeaders } from '$lib/server/services/csv';
import { formatDateCourt, formatAmplitude, formatDuree, formatHeure } from '$lib/format';
import { aPause } from '$lib/heures';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);
const dec = (h: number) => h.toFixed(2).replace('.', ',');

/**
 * Export CSV de l'historique des interventions d'un intervenant (espace admin).
 * Réservé à l'admin ; mêmes colonnes que l'export intervenant `/mon-recap/export`.
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	requireAdmin(locals.user);
	const intervenant = await getIntervenant(params.id);
	if (!intervenant) throw error(404, 'Intervenant introuvable');

	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const recap = await recapHeures(intervenant.id, from, to);

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

	const suffixe = from || to ? `_${from ?? 'debut'}_${to ?? 'fin'}` : '';
	return new Response(toCSV(rows), {
		headers: csvHeaders(`interventions_${intervenant.nom}_${intervenant.prenom}${suffixe}.csv`)
	});
};
