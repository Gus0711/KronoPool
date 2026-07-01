import { requireIntervenant } from '$lib/server/auth/guards';
import { recapHeures } from '$lib/server/services/reservations';
import { toCSV, csvHeaders } from '$lib/server/services/csv';
import { formatDateCourt, formatDuree } from '$lib/format';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: string | null): string | undefined => (v && DATE_RE.test(v) ? v : undefined);

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireIntervenant(locals.user);
	const from = clean(url.searchParams.get('from'));
	const to = clean(url.searchParams.get('to'));
	const recap = await recapHeures(user.id, from, to);

	const rows: (string | number)[][] = [
		['Date', 'Début', 'Fin', 'Niveau', 'Commentaire', 'Durée (h)']
	];
	for (const l of recap.lignes) {
		rows.push([
			formatDateCourt(l.date),
			l.heureDebut,
			l.heureFin,
			l.niveauRequis,
			l.commentaire ?? '',
			l.dureeHeures.toFixed(2).replace('.', ',')
		]);
	}
	rows.push([]);
	rows.push(['Total', '', '', '', '', recap.total.toFixed(2).replace('.', ',')]);

	const csv = toCSV(rows);
	const suffixe = from || to ? `_${from ?? 'debut'}_${to ?? 'fin'}` : '';
	return new Response(csv, {
		headers: csvHeaders(`recap_${user.nom}_${user.prenom}${suffixe}.csv`)
	});
};
