import { describe, it, expect } from 'vitest';
import { construireIcal } from './ical';

const NOW = new Date('2026-07-02T10:00:00Z');

describe('construireIcal', () => {
	it('produit un VCALENDAR valide avec un VEVENT en UTC', () => {
		const ics = construireIcal(
			[
				{
					posteId: 'abc',
					niveauRequis: 'MNS',
					date: '2026-09-05',
					heureDebut: '09:00',
					heureFin: '13:00',
					commentaire: 'Bassin sportif'
				}
			],
			NOW
		);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain('END:VCALENDAR');
		expect(ics).toContain('UID:poste-abc@kronopool');
		// 09:00 Paris en septembre (CEST +2) => 07:00 UTC
		expect(ics).toContain('DTSTART:20260905T070000Z');
		expect(ics).toContain('DTEND:20260905T110000Z');
		expect(ics).toContain('SUMMARY:Surveillance piscine (MNS)');
		expect(ics).toContain('DESCRIPTION:Bassin sportif');
		// Fins de ligne CRLF (RFC 5545).
		expect(ics).toContain('\r\n');
	});

	it('échappe les caractères spéciaux du commentaire', () => {
		const ics = construireIcal(
			[
				{
					posteId: 'x',
					niveauRequis: 'BNSSA',
					date: '2026-09-05',
					heureDebut: '09:00',
					heureFin: '13:00',
					commentaire: 'Renfort; matin, bassin'
				}
			],
			NOW
		);
		expect(ics).toContain('DESCRIPTION:Renfort\\; matin\\, bassin');
	});

	it('gère un calendrier vide (aucun créneau)', () => {
		const ics = construireIcal([], NOW);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).not.toContain('BEGIN:VEVENT');
	});
});
