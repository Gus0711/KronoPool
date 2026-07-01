import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './auth/password';
import { decompteHeures } from '$lib/heures';

/** Validations Zod réutilisées par les form actions (CDC §8 — Zod sur toutes les entrées). */

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)');
const heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:MM)');
/** Heure de pause optionnelle : `HH:MM`, chaîne vide ou absente → `null`. */
const heureOptionnelle = heure
	.or(z.literal(''))
	.nullish()
	.transform((v) => (v ? v : null));

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

/**
 * Besoin (création **et** édition) : entête + pause optionnelle + nombre de postes.
 * Règles de pause (CDC — pause à horaire précis déduite du temps effectif) :
 * les deux champs ensemble ou aucun ; pause dans [début, fin] ; fin > début ;
 * temps de travail effectif strictement positif.
 */
export const besoinCreate = z
	.object({
		date: dateISO,
		heureDebut: heure,
		heureFin: heure,
		pauseDebut: heureOptionnelle,
		pauseFin: heureOptionnelle,
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
	})
	.refine((d) => !!d.pauseDebut === !!d.pauseFin, {
		message: 'Renseignez le début ET la fin de la pause, ou aucun des deux.',
		path: ['pauseFin']
	})
	.refine(
		(d) =>
			!d.pauseDebut || !d.pauseFin || (d.pauseDebut >= d.heureDebut && d.pauseFin <= d.heureFin),
		{ message: 'La pause doit être comprise dans le créneau.', path: ['pauseDebut'] }
	)
	.refine((d) => !d.pauseDebut || !d.pauseFin || d.pauseFin > d.pauseDebut, {
		message: 'La fin de pause doit être après le début de pause.',
		path: ['pauseFin']
	})
	.refine((d) => decompteHeures(d.heureDebut, d.heureFin, d.pauseDebut, d.pauseFin).effectif > 0, {
		message: 'Le temps de travail effectif doit être positif.',
		path: ['pauseFin']
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
