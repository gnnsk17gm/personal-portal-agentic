CREATE TABLE `finance_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`recurring_id` integer,
	`billing_month` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recurring_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_transactions_recurring_month_uidx` ON `finance_transactions` (`recurring_id`,`billing_month`) WHERE "finance_transactions"."recurring_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`month` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_generations` (
	`recurring_id` integer NOT NULL,
	`billing_month` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`recurring_id`, `billing_month`),
	FOREIGN KEY (`recurring_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
