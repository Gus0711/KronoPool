import { describe, it, expect } from 'vitest';
import { niveauxVisibles, estEligible } from './eligibilite';

describe('éligibilité par niveau (CDC §4.1)', () => {
	it('un MNS voit MNS et BNSSA', () => {
		expect(niveauxVisibles('MNS')).toEqual(['MNS', 'BNSSA']);
	});
	it('un BNSSA ne voit que BNSSA', () => {
		expect(niveauxVisibles('BNSSA')).toEqual(['BNSSA']);
	});
	it('un admin (niveau null) ne voit rien', () => {
		expect(niveauxVisibles(null)).toEqual([]);
	});

	it('poste BNSSA réservable par BNSSA ou MNS', () => {
		expect(estEligible('BNSSA', 'BNSSA')).toBe(true);
		expect(estEligible('MNS', 'BNSSA')).toBe(true);
	});
	it('poste MNS réservable uniquement par MNS', () => {
		expect(estEligible('MNS', 'MNS')).toBe(true);
		expect(estEligible('BNSSA', 'MNS')).toBe(false);
	});
});
