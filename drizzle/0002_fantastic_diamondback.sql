CREATE TABLE `bingo_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`playerId` int NOT NULL,
	`numbers` json NOT NULL,
	`markedNumbers` json NOT NULL DEFAULT ('[]'),
	`isBingo` int NOT NULL DEFAULT 0,
	`bingoTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bingo_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bingo_games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`drawnNumbers` json NOT NULL DEFAULT ('[]'),
	`winners` json NOT NULL DEFAULT ('[]'),
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bingo_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bingo_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`maxPlayers` int NOT NULL DEFAULT 20,
	`currentPlayers` int NOT NULL DEFAULT 0,
	`creatorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bingo_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`playerId` int NOT NULL,
	`status` enum('joined','bingo','left') NOT NULL DEFAULT 'joined',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`totalGames` int NOT NULL DEFAULT 0,
	`bingoCount` int NOT NULL DEFAULT 0,
	`winRate` int NOT NULL DEFAULT 0,
	`bestScore` int,
	`averageDraws` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_stats_playerId_unique` UNIQUE(`playerId`)
);
