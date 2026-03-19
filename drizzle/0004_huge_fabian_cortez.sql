CREATE TABLE `ai_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openaiKey` varchar(255),
	`geminiKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_api_keys_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ai_star_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dateStr` varchar(10) NOT NULL,
	`sourceHour` varchar(2) NOT NULL,
	`targetHour` varchar(2) NOT NULL,
	`goldenBalls` json NOT NULL,
	`isManual` int NOT NULL DEFAULT 0,
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_star_predictions_id` PRIMARY KEY(`id`)
);
