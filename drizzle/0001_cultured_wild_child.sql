CREATE TABLE `ai_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetDrawNumber` varchar(20) NOT NULL,
	`recommendedNumbers` json NOT NULL,
	`totalBigSmall` varchar(10) NOT NULL,
	`totalBigSmallConfidence` int NOT NULL,
	`totalOddEven` varchar(10) NOT NULL,
	`totalOddEvenConfidence` int NOT NULL,
	`superBigSmall` varchar(10) NOT NULL,
	`superBigSmallConfidence` int NOT NULL,
	`superOddEven` varchar(10) NOT NULL,
	`superOddEvenConfidence` int NOT NULL,
	`platePrediction` varchar(10) NOT NULL,
	`plateConfidence` int NOT NULL,
	`aiSuggestion` text,
	`sampleSize` int NOT NULL,
	`overallConfidence` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `draw_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drawNumber` varchar(20) NOT NULL,
	`drawTime` bigint NOT NULL,
	`numbers` json NOT NULL,
	`superNumber` int NOT NULL,
	`total` int NOT NULL,
	`bigSmall` varchar(10) NOT NULL,
	`oddEven` varchar(10) NOT NULL,
	`plate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `draw_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `draw_records_drawNumber_unique` UNIQUE(`drawNumber`)
);
