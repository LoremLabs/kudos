CREATE TABLE `pools` (
	`pool_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`permissions` text,
	`config` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
