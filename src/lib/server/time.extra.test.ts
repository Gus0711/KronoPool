import { describe, it, expect } from 'vitest';
import { parisWallToInstant } from './time';

describe('parisWallToInstant', () => {
	it('convertit une heure murale en été (UTC+2) vers UTC', () => {
		// 5 sept 2026 09:00 Paris (CEST, +02:00) => 07:00 UTC
		expect(parisWallToInstant('2026-09-05', '09:00').toISOString()).toBe('2026-09-05T07:00:00.000Z');
	});

	it('convertit une heure murale en hiver (UTC+1) vers UTC', () => {
		// 10 jan 2026 09:00 Paris (CET, +01:00) => 08:00 UTC
		expect(parisWallToInstant('2026-01-10', '09:00').toISOString()).toBe('2026-01-10T08:00:00.000Z');
	});

	it('gère de part et d’autre du changement d’heure de mars (horaires de journée)', () => {
		// Bascule le dernier dimanche de mars 2026 (29/03) à 02:00→03:00.
		// La veille en CET(+1), le jour même (après-midi) en CEST(+2).
		expect(parisWallToInstant('2026-03-28', '10:00').toISOString()).toBe('2026-03-28T09:00:00.000Z');
		expect(parisWallToInstant('2026-03-29', '10:00').toISOString()).toBe('2026-03-29T08:00:00.000Z');
	});
});
