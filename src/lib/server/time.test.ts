import { describe, it, expect } from 'vitest';
import { parisNowKey, posteKey, dureeHeures } from './time';

describe('temps & comparaison « futur » (Europe/Paris)', () => {
	it('posteKey concatène date + heure en clé lexicographique', () => {
		expect(posteKey('2025-07-05', '09:00')).toBe('2025-07-05T09:00');
	});

	it('ordre lexical = ordre chronologique', () => {
		expect(posteKey('2025-07-05', '09:00') < posteKey('2025-07-05', '14:00')).toBe(true);
		expect(posteKey('2025-07-05', '23:00') < posteKey('2025-07-06', '08:00')).toBe(true);
	});

	it('parisNowKey a le format YYYY-MM-DDTHH:MM', () => {
		expect(parisNowKey()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
	});

	it('dureeHeures calcule les heures décimales', () => {
		expect(dureeHeures('09:00', '13:00')).toBe(4);
		expect(dureeHeures('14:00', '18:30')).toBe(4.5);
		expect(dureeHeures('10:15', '10:45')).toBe(0.5);
	});
});
