import { describe, it, expect } from 'vitest';
import { occurrencesHebdo, MAX_OCCURRENCES } from './recurrence';

describe('occurrencesHebdo', () => {
	it('énumère tous les samedis d’un intervalle (bornes incluses)', () => {
		// 2026-09-05 est un samedi ; 2026-09-26 aussi.
		const dates = occurrencesHebdo([6], '2026-09-05', '2026-09-26');
		expect(dates).toEqual(['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26']);
	});

	it('gère plusieurs jours par semaine et les trie chronologiquement', () => {
		// Samedi (6) + dimanche (0), du samedi 5 au dimanche 13 sept 2026.
		const dates = occurrencesHebdo([6, 0], '2026-09-05', '2026-09-13');
		expect(dates).toEqual(['2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13']);
	});

	it('inclut la date de fin si elle tombe un jour ciblé', () => {
		// 2026-09-07 est un lundi.
		const dates = occurrencesHebdo([1], '2026-09-07', '2026-09-07');
		expect(dates).toEqual(['2026-09-07']);
	});

	it('retourne vide si aucun jour ne correspond', () => {
		expect(occurrencesHebdo([0], '2026-09-07', '2026-09-11')).toEqual([]);
	});

	it('retourne vide si la date de début est après la date de fin', () => {
		expect(occurrencesHebdo([6], '2026-09-26', '2026-09-05')).toEqual([]);
	});

	it('respecte le plafond d’occurrences', () => {
		const dates = occurrencesHebdo([1, 2, 3, 4, 5, 6, 0], '2026-01-01', '2027-12-31', MAX_OCCURRENCES);
		expect(dates).toHaveLength(MAX_OCCURRENCES);
	});
});
