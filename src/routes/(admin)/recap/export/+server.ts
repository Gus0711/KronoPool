import { recapGlobal } from '$lib/server/services/recap-global';
import { toCSV, csvHeaders } from '$lib/server/services/csv';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);

export const GET: RequestHandler = async ({ url }) => {
	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const lignes = await recapGlobal(from, to);

	const dec = (h: number) => h.toFixed(2).replace('.', ',');
	const rows: (string | number)[][] = [
		['Nom', 'Prénom', 'Niveau', 'Créneaux', 'Amplitude (h)', 'Temps de travail effectif (h)']
	];
	for (const l of lignes) {
		rows.push([
			l.nom,
			l.prenom,
			l.niveau ?? '',
			l.nbCreneaux,
			dec(l.amplitudeHeures),
			dec(l.totalHeures)
		]);
	}

	const suffixe = from || to ? `_${from ?? 'debut'}_${to ?? 'fin'}` : '';
	return new Response(toCSV(rows), { headers: csvHeaders(`recap_global${suffixe}.csv`) });
};
