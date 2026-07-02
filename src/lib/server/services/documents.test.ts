import { describe, it, expect } from 'vitest';
import { conformiteVersValidite, estMimeAutorise, statutDocuments } from './conformite';

const PASSE = '2000-01-01';
const FUTUR = '2099-12-31';
const FUTUR_LOINTAIN = '2100-06-30';

describe('statutDocuments', () => {
	it('aucun document → manquant', () => {
		expect(statutDocuments([]).statut).toBe('manquant');
	});

	it('un document sans expiration (permanent) → present', () => {
		expect(statutDocuments([{ dateExpiration: null }])).toEqual({
			statut: 'present',
			dateExpiration: null
		});
	});

	it('un document valide → present avec sa date', () => {
		expect(statutDocuments([{ dateExpiration: FUTUR }])).toEqual({
			statut: 'present',
			dateExpiration: FUTUR
		});
	});

	it('un document expiré → expire', () => {
		expect(statutDocuments([{ dateExpiration: PASSE }])).toEqual({
			statut: 'expire',
			dateExpiration: PASSE
		});
	});

	it('un expiré + un valide → present (le valide fait foi)', () => {
		expect(statutDocuments([{ dateExpiration: PASSE }, { dateExpiration: FUTUR }]).statut).toBe(
			'present'
		);
	});

	it('deux valides → retient l’expiration la plus lointaine', () => {
		expect(
			statutDocuments([{ dateExpiration: FUTUR }, { dateExpiration: FUTUR_LOINTAIN }]).dateExpiration
		).toBe(FUTUR_LOINTAIN);
	});

	it('permanent + daté → permanent l’emporte (date null)', () => {
		expect(
			statutDocuments([{ dateExpiration: FUTUR }, { dateExpiration: null }]).dateExpiration
		).toBeNull();
	});

	it('tous expirés → expire avec la date la plus récente', () => {
		expect(
			statutDocuments([{ dateExpiration: '2000-01-01' }, { dateExpiration: '2010-05-05' }])
		).toEqual({ statut: 'expire', dateExpiration: '2010-05-05' });
	});
});

describe('conformiteVersValidite', () => {
	it('manquant → absent', () => {
		expect(conformiteVersValidite({ typeId: 't', libelle: 'X', statut: 'manquant', dateExpiration: null })).toEqual({
			date: null,
			statut: 'absent'
		});
	});
	it('expire → expire', () => {
		expect(conformiteVersValidite({ typeId: 't', libelle: 'X', statut: 'expire', dateExpiration: PASSE })).toEqual({
			date: PASSE,
			statut: 'expire'
		});
	});
	it('present → ok', () => {
		expect(conformiteVersValidite({ typeId: 't', libelle: 'X', statut: 'present', dateExpiration: FUTUR })).toEqual({
			date: FUTUR,
			statut: 'ok'
		});
	});
});

describe('estMimeAutorise', () => {
	it('accepte PDF et images courantes', () => {
		expect(estMimeAutorise('application/pdf')).toBe(true);
		expect(estMimeAutorise('image/jpeg')).toBe(true);
		expect(estMimeAutorise('image/png')).toBe(true);
	});
	it('refuse les autres types', () => {
		expect(estMimeAutorise('application/zip')).toBe(false);
		expect(estMimeAutorise('text/html')).toBe(false);
		expect(estMimeAutorise('')).toBe(false);
	});
});
