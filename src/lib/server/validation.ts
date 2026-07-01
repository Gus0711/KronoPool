import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './auth/password';

/** Validations Zod réutilisées par les form actions (CDC §8 — Zod sur toutes les entrées). */

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)');
const heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:MM)');
const dateOptionnelle = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')
	.optional()
	.or(z.literal(''))
	.transform((v) => (v ? v : null));

/** Entête de besoin (commun création/édition) : heure de fin > heure de début. */
export const besoinBase = z
	.object({
		date: dateISO,
		heureDebut: heure,
		heureFin: heure,
		commentaire: z
			.string()
			.trim()
			.max(500)
			.optional()
			.transform((v) => (v ? v : null))
	})
	.refine((d) => d.heureFin > d.heureDebut, {
		message: "L'heure de fin doit être après l'heure de début",
		path: ['heureFin']
	});

/** Création de besoin : + nombre de postes MNS / BNSSA (≥ 1 poste au total). */
export const besoinCreate = z
	.object({
		date: dateISO,
		heureDebut: heure,
		heureFin: heure,
		commentaire: z
			.string()
			.trim()
			.max(500)
			.optional()
			.transform((v) => (v ? v : null)),
		nbMns: z.coerce.number().int().min(0).max(50),
		nbBnssa: z.coerce.number().int().min(0).max(50)
	})
	.refine((d) => d.heureFin > d.heureDebut, {
		message: "L'heure de fin doit être après l'heure de début",
		path: ['heureFin']
	})
	.refine((d) => d.nbMns + d.nbBnssa >= 1, {
		message: 'Au moins un poste (MNS ou BNSSA) est requis',
		path: ['nbBnssa']
	});

/** Intervenant (création/édition) — hors mot de passe. */
export const intervenantSchema = z.object({
	nom: z.string().trim().min(1, 'Nom requis').max(100),
	prenom: z.string().trim().min(1, 'Prénom requis').max(100),
	email: z.string().trim().toLowerCase().email('Email invalide'),
	telephone: z
		.string()
		.trim()
		.max(30)
		.optional()
		.transform((v) => (v ? v : null)),
	niveau: z.enum(['MNS', 'BNSSA']),
	dateValiditeTitre: dateOptionnelle,
	dateValiditePse: dateOptionnelle
});

/** Mot de passe initial / réinitialisé. */
export const motDePasse = z
	.string()
	.min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`);
