CREATE TABLE `rappel` (
	`id` text PRIMARY KEY NOT NULL,
	`poste_id` text NOT NULL,
	`kind` text NOT NULL,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`poste_id`) REFERENCES `poste`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rappel_poste_kind_idx` ON `rappel` (`poste_id`,`kind`);--> statement-breakpoint
ALTER TABLE `user` ADD `calendar_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_calendar_token_unique` ON `user` (`calendar_token`);