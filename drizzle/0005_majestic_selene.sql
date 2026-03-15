CREATE TABLE `ai_super_prize_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dateStr` varchar(10) NOT NULL,
	`sourceHour` varchar(2) NOT NULL,
	`targetHour` varchar(2) NOT NULL,
	`candidateBalls` json NOT NULL,
	`isManual` int NOT NULL DEFAULT 0,
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_super_prize_predictions_id` PRIMARY KEY(`id`)
);
