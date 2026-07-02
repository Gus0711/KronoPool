CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type_id` text,
	`nom_fichier` text NOT NULL,
	`stored_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`taille` integer NOT NULL,
	`date_expiration` text,
	`uploaded_by` text NOT NULL,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `document_type`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document_type` (
	`id` text PRIMARY KEY NOT NULL,
	`libelle` text NOT NULL,
	`obligatoire` integer DEFAULT false NOT NULL,
	`niveau_requis` text,
	`ordre` integer DEFAULT 0 NOT NULL,
	`actif` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
