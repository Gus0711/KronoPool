import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import { getDocument } from '$lib/server/services/documents';
import { readFileBuffer } from '$lib/server/storage/documents';
import type { RequestHandler } from './$types';

/**
 * Téléchargement d'un document — **protégé**. Un intervenant n'accède qu'à SES
 * documents ; l'admin accède à tous. Aucune URL publique vers les fichiers.
 * `?download` force le téléchargement plutôt que l'affichage inline.
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const u = requireUser(locals.user);
	const doc = await getDocument(params.id);
	if (!doc) throw error(404, 'Document introuvable');

	if (u.role !== 'admin' && doc.userId !== u.id) {
		throw error(403, 'Accès refusé');
	}

	let data: Buffer;
	try {
		data = await readFileBuffer(doc.userId, doc.storedName);
	} catch {
		throw error(404, 'Fichier introuvable');
	}

	const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
	const nom = encodeURIComponent(doc.nomFichier);
	const body = new Blob([new Uint8Array(data)], { type: doc.mimeType });
	return new Response(body, {
		headers: {
			'Content-Type': doc.mimeType,
			'Content-Disposition': `${disposition}; filename*=UTF-8''${nom}`,
			'Cache-Control': 'private, no-store'
		}
	});
};
