import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

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

export const besoin = sqliteTable(
	'besoin',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		/** `YYYY-MM-DD` (heure locale Europe/Paris). */
		date: text('date').notNull(),
		/** `HH:MM`. */
		heureDebut: text('heure_debut').notNull(),
		/** `HH:MM`. */
		heureFin: text('heure_fin').notNull(),
		/** Début de pause `HH:MM` — nullable. Renseigné avec {@link pauseFin} ou aucun. */
		pauseDebut: text('pause_debut'),
		/** Fin de pause `HH:MM` — nullable. La pause est déduite du temps effectif. */
		pauseFin: text('pause_fin'),
		commentaire: text('commentaire'),
		/**
		 * Identifiant de **série** : regroupe les besoins générés ensemble par la
		 * création récurrente (« tous les samedis… »). `null` = besoin isolé.
		 * Permet de gérer la série (badge, suppression groupée des occurrences futures).
		 */
		serieId: text('serie_id'),
		createdBy: text('created_by')
			.notNull()
			.references(() => user.id),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(t) => ({
		serieIdx: index('besoin_serie_id_idx').on(t.serieId)
	})
);

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

/**
 * Catalogue des **types de documents** (configurable par l'admin).
 * Un type peut être marqué `obligatoire`. `niveauRequis` restreint l'obligation
 * à un niveau (ex. « Diplôme MNS » obligatoire seulement pour les MNS) ; `null`
 * = applicable à tous les intervenants. `actif = false` désactive sans supprimer
 * (les documents déjà rattachés sont conservés).
 */
export const documentType = sqliteTable('document_type', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	libelle: text('libelle').notNull(),
	obligatoire: integer('obligatoire', { mode: 'boolean' }).notNull().default(false),
	/** `MNS` | `BNSSA` ; `null` = tous niveaux. */
	niveauRequis: text('niveau_requis', { enum: NIVEAUX }),
	ordre: integer('ordre').notNull().default(0),
	actif: integer('actif', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Document téléversé rattaché à un intervenant. Le binaire vit sur le disque
 * (`storedName` = nom aléatoire, jamais le nom client), seules les métadonnées
 * sont en base. `typeId` → `set null` : supprimer un type ne détruit pas les
 * fichiers déjà envoyés. `dateExpiration` (optionnelle) alimente la conformité.
 */
export const document = sqliteTable('document', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	typeId: text('type_id').references(() => documentType.id, { onDelete: 'set null' }),
	/** Nom d'origine du fichier (affichage / téléchargement). */
	nomFichier: text('nom_fichier').notNull(),
	/** Nom de stockage sur disque (uuid + extension). */
	storedName: text('stored_name').notNull(),
	mimeType: text('mime_type').notNull(),
	/** Taille en octets. */
	taille: integer('taille').notNull(),
	/** Date d'expiration `YYYY-MM-DD` — nullable. */
	dateExpiration: text('date_expiration'),
	uploadedBy: text('uploaded_by')
		.notNull()
		.references(() => user.id),
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Abonnement Web Push d'un utilisateur (un par appareil/navigateur).
 * `endpoint` unique = identifiant du push service ; `p256dh`/`auth` = clés de
 * chiffrement du client. Supprimé si le push service répond 404/410 (périmé).
 */
export const pushSubscription = sqliteTable('push_subscription', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
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
export type DocumentType = typeof documentType.$inferSelect;
export type DocumentRow = typeof document.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
