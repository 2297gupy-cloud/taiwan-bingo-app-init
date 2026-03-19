CREATE TABLE `ai_star_hit_rate_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`analysisDate` varchar(10) NOT NULL,
	`totalPredictions` int NOT NULL DEFAULT 0,
	`totalHits` int NOT NULL DEFAULT 0,
	`hitRate` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_star_hit_rate_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_star_verification_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`analysisDate` varchar(10) NOT NULL,
	`slotHour` varchar(2) NOT NULL,
	`recommendedBalls` json NOT NULL,
	`actualResult` json,
	`hitCount` int NOT NULL DEFAULT 0,
	`hitStatus` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_star_verification_records_id` PRIMARY KEY(`id`)
);
