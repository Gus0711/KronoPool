import { describe, it, expect } from 'vitest';
import { decompteHeures, aPause } from './heures';

describe('décompte des heures (pause déduite)', () => {
	it('sans pause : effectif = amplitude', () => {
		const d = decompteHeures('08:00', '18:00');
		expect(d.amplitude).toBe(10);
		expect(d.pause).toBe(0);
		expect(d.effectif).toBe(10);
	});

	it('avec pause : 08:00→18:00, pause 12:30→13:30 = 9 h', () => {
		const d = decompteHeures('08:00', '18:00', '12:30', '13:30');
		expect(d.amplitude).toBe(10);
		expect(d.pause).toBe(1);
		expect(d.effectif).toBe(9);
	});

	it('pause ignorée si un seul champ renseigné', () => {
		expect(decompteHeures('08:00', '18:00', '12:30', null).effectif).toBe(10);
		expect(decompteHeures('08:00', '18:00', null, '13:30').effectif).toBe(10);
	});

	it('aPause reflète la présence des deux bornes', () => {
		expect(aPause('12:30', '13:30')).toBe(true);
		expect(aPause('12:30', null)).toBe(false);
		expect(aPause(null, null)).toBe(false);
	});

	it('gère les demi-heures', () => {
		expect(decompteHeures('09:00', '12:15', '10:00', '10:30').effectif).toBe(2.75);
	});
});
