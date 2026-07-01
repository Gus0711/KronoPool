CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`poste_id` text NOT NULL,
	`action` text NOT NULL,
	`ancien_intervenant` text,
	`admin_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `besoin` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`heure_debut` text NOT NULL,
	`heure_fin` text NOT NULL,
	`commentaire` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `poste` (
	`id` text PRIMARY KEY NOT NULL,
	`besoin_id` text NOT NULL,
	`niveau_requis` text NOT NULL,
	`reserved_by` text,
	`reserved_at` integer,
	FOREIGN KEY (`besoin_id`) REFERENCES `besoin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`nom` text NOT NULL,
	`prenom` text NOT NULL,
	`telephone` text,
	`email` text NOT NULL,
	`niveau` text,
	`date_validite_titre` text,
	`date_validite_pse` text,
	`password_hash` text NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`actif` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);