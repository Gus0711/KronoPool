import { describe, it, expect } from 'vitest';
import { formatDate, formatDuree, formatJour, formatPlage, initiales } from './format';

describe('formatage FR', () => {
	it('formatDuree', () => {
		expect(formatDuree(4)).toBe('4 h');
		expect(formatDuree(3.5)).toBe('3 h 30');
		expect(formatDuree(0.25)).toBe('0 h 15');
	});
	it('formatJour capitalise le jour de la semaine', () => {
		expect(formatJour('2025-07-05')).toBe('Samedi 5 juillet');
	});
	it('formatPlage', () => {
		expect(formatPlage('09:00', '13:00')).toBe('09:00 – 13:00');
	});
	it('initiales', () => {
		expect(initiales('Camille', 'Rivière')).toBe('CR');
	});

	// Robustesse : un horodatage corrompu ne doit jamais faire planter le rendu.
	it('formatDate tolère une Date invalide / absente', () => {
		expect(formatDate(new Date('2026-07-05'))).toBe('05/07/2026');
		expect(formatDate(new Date(NaN))).toBe('—');
		expect(formatDate(null)).toBe('—');
		expect(formatDate(undefined)).toBe('—');
	});
	it('formatJour ne lève pas sur une date invalide', () => {
		expect(() => formatJour('pas-une-date')).not.toThrow();
		expect(formatJour('pas-une-date')).toBe('pas-une-date');
	});
});
