CREATE TABLE `events` (
	`pool_id` text NOT NULL,
	`event_id` text NOT NULL,
	`recipient` text NOT NULL,
	`sender` text NOT NULL,
	`ts` text NOT NULL,
	`scope_id` text,
	`kudos` integer DEFAULT 1 NOT NULL,
	`emoji` text,
	`title` text,
	`visibility` text DEFAULT 'PRIVATE' NOT NULL,
	`meta` text,
	`inserted_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`pool_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_events_pool_ts_id` ON `events` (`pool_id`,`ts`,`event_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pool_id` text NOT NULL,
	`event_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`delivered` integer DEFAULT 0 NOT NULL,
	`delivered_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_pending` ON `outbox` (`delivered`,`created_at`);--> statement-breakpoint
CREATE TABLE `pool_recipient_totals` (
	`pool_id` text NOT NULL,
	`recipient` text NOT NULL,
	`kudos` integer DEFAULT 0 NOT NULL,
	`emojis` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`pool_id`, `recipient`)
);
--> statement-breakpoint
CREATE INDEX `idx_recipient_totals_by_kudos` ON `pool_recipient_totals` (`pool_id`,`kudos`);--> statement-breakpoint
CREATE TABLE `pool_scope_latest` (
	`pool_id` text NOT NULL,
	`recipient` text NOT NULL,
	`scope_id` text NOT NULL,
	`event_id` text NOT NULL,
	`kudos` integer NOT NULL,
	`ts` text NOT NULL,
	PRIMARY KEY(`pool_id`, `recipient`, `scope_id`)
);
--> statement-breakpoint
CREATE TABLE `pool_totals` (
	`pool_id` text PRIMARY KEY NOT NULL,
	`kudos` integer DEFAULT 0 NOT NULL
);
