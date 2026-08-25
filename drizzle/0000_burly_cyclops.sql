CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`due_date` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_user_archived_status` ON `tasks` (`user_id`,`archived`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_user_archived_due` ON `tasks` (`user_id`,`archived`,`due_date`);