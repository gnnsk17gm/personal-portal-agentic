CREATE TABLE `agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `agent_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`step_name` text NOT NULL,
	`status` text DEFAULT 'success' NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
