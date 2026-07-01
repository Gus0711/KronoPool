import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Modèle de données KronoPool (CDC §5).
 *
 * Conventions :
 * - `id` : uuid texte (crypto.randomUUID) — compatible SQLite local & Turso.
 * - dates « métier » (validités, date de besoin) : texte `YYYY-MM-DD`.
 * - heures : texte `HH:MM`.
 * - horodatages système (`created_at`, `expires_at`, `reserved_at`) : entier
 *   timestamp (mode `timestamp` Drizzle → Date en JS).
 * - booléens : entier `{ mode: 'boolean' }`.
 *
 * Extensibilité (ne pas casser, cf. CDC §5 / CLAUDE.md) :
 * - futur `type_intervenant` (`externe`/`interne`) sur `user`.
 * - futur `tarif_horaire` sur `poste`.
 */

export const ROLES = ['admin', 'intervenant'] as const;
export type Role = (typeof ROLES)[number];

export const NIVEAUX = ['MNS', 'BNSSA'] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	role: text('role', { enum: ROLES }).notNull(),
	nom: text('nom').notNull(),
	prenom: text('prenom').notNull(),
	telephone: text('telephone'),
	email: text('email').notNull().unique(),
	/** `MNS` | `BNSSA` ; `null` pour un admin. */
	niveau: text('niveau', { enum: NIVEAUX }),
	/** Validité BNSSA/MNS (CAEPMNS), format `YYYY-MM-DD`. */
	dateValiditeTitre: text('date_validite_titre'),
	/** Validité secourisme PSE1, format `YYYY-MM-DD`. */
	dateValiditePse: text('date_validite_pse'),
	passwordHash: text('password_hash').notNull(),
	mustChangePassword: integer('must_change_password', { mode: 'boolean' })
		.notNull()
		.default(true),
	actif: integer('actif', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const session = sqliteTable('session', {
	/** PK = token de session **hashé** (SHA-256). */
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const besoin = sqliteTable('besoin', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** `YYYY-MM-DD` (heure locale Europe/Paris). */
	date: text('date').notNull(),
	/** `HH:MM`. */
	heureDebut: text('heure_debut').notNull(),
	/** `HH:MM`. */
	heureFin: text('heure_fin').notNull(),
	commentaire: text('commentaire'),
	createdBy: text('created_by')
		.notNull()
		.references(() => user.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const poste = sqliteTable('poste', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	besoinId: text('besoin_id')
		.notNull()
		.references(() => besoin.id, { onDelete: 'cascade' }),
	niveauRequis: text('niveau_requis', { enum: NIVEAUX }).notNull(),
	/** `null` = libre (premier arrivé, premier servi). */
	reservedBy: text('reserved_by').references(() => user.id),
	reservedAt: integer('reserved_at', { mode: 'timestamp' })
});

/** Trace des libérations de poste par l'admin (CDC §5). */
export const auditLog = sqliteTable('audit_log', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	posteId: text('poste_id').notNull(),
	action: text('action').notNull(),
	/** Intervenant qui détenait le poste avant libération. */
	ancienIntervenant: text('ancien_intervenant'),
	adminId: text('admin_id')
		.notNull()
		.references(() => user.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Besoin = typeof besoin.$inferSelect;
export type Poste = typeof poste.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
