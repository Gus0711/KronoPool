ALTER TABLE `besoin` ADD `serie_id` text;--> statement-breakpoint
CREATE INDEX `besoin_serie_id_idx` ON `besoin` (`serie_id`);