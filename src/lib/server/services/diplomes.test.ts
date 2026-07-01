import { describe, it, expect } from 'vitest';
import { statutValidite, estEnAlerte } from './diplomes';

const today = '2026-07-01';

describe('statut de validité des diplômes (CDC §4.4)', () => {
	it('date absente → absent', () => {
		expect(statutValidite(null, today).statut).toBe('absent');
	});
	it('date passée → expiré', () => {
		expect(statutValidite('2026-06-30', today).statut).toBe('expire');
	});
	it('date sous 30 jours → bientôt', () => {
		const r = statutValidite('2026-07-20', today);
		expect(r.statut).toBe('bientot');
		expect(r.joursRestants).toBe(19);
	});
	it('date au-delà de 30 jours → ok', () => {
		expect(statutValidite('2026-09-01', today).statut).toBe('ok');
	});

	it('alerte pour expiré et bientôt uniquement', () => {
		expect(estEnAlerte(statutValidite('2026-06-01', today))).toBe(true);
		expect(estEnAlerte(statutValidite('2026-07-10', today))).toBe(true);
		expect(estEnAlerte(statutValidite('2027-01-01', today))).toBe(false);
		expect(estEnAlerte(statutValidite(null, today))).toBe(false);
	});
});
