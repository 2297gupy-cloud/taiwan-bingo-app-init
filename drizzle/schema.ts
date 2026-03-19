import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 台灣賓果開獎記錄表
 * 每期開出 20 個號碼 (01-80)
 */
export const drawRecords = mysqlTable("draw_records", {
  id: int("id").autoincrement().primaryKey(),
  /** 期號，例如 1150313086 */
  drawNumber: varchar("drawNumber", { length: 20 }).notNull().unique(),
  /** 開獎時間（民國年份格式：115/03/15 08:10:00） */
  drawTime: varchar("drawTime", { length: 50 }).notNull(),
  /** 20 個開獎號碼，JSON 陣列，例如 [5,15,17,24,...] */
  numbers: json("numbers").notNull().$type<number[]>(),
  /** 超級獎號（第一個開出的號碼） */
  superNumber: int("superNumber").notNull(),
  /** 總和 */
  total: int("total").notNull(),
  /** 大小: big / small / tie */
  bigSmall: varchar("bigSmall", { length: 10 }).notNull(),
  /** 單雙: odd / even */
  oddEven: varchar("oddEven", { length: 10 }).notNull(),
  /** 盤面: upper / lower / middle */
  plate: varchar("plate", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrawRecord = typeof drawRecords.$inferSelect;
export type InsertDrawRecord = typeof drawRecords.$inferInsert;

/**
 * AI 預測記錄表
 */
export const aiPredictions = mysqlTable("ai_predictions", {
  id: int("id").autoincrement().primaryKey(),
  /** 預測的目標期號 */
  targetDrawNumber: varchar("targetDrawNumber", { length: 20 }).notNull(),
  /** 推薦號碼 JSON 陣列 */
  recommendedNumbers: json("recommendedNumbers").notNull().$type<number[]>(),
  /** 總和大小預測 */
  totalBigSmall: varchar("totalBigSmall", { length: 10 }).notNull(),
  totalBigSmallConfidence: int("totalBigSmallConfidence").notNull(),
  /** 總和單雙預測 */
  totalOddEven: varchar("totalOddEven", { length: 10 }).notNull(),
  totalOddEvenConfidence: int("totalOddEvenConfidence").notNull(),
  /** 超級大小預測 */
  superBigSmall: varchar("superBigSmall", { length: 10 }).notNull(),
  superBigSmallConfidence: int("superBigSmallConfidence").notNull(),
  /** 超級單雙預測 */
  superOddEven: varchar("superOddEven", { length: 10 }).notNull(),
  superOddEvenConfidence: int("superOddEvenConfidence").notNull(),
  /** 盤面預測 */
  platePrediction: varchar("platePrediction", { length: 10 }).notNull(),
  plateConfidence: int("plateConfidence").notNull(),
  /** AI 建議文字 */
  aiSuggestion: text("aiSuggestion"),
  /** 樣本數 */
  sampleSize: int("sampleSize").notNull(),
  /** 整體信心度 */
  overallConfidence: int("overallConfidence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiPrediction = typeof aiPredictions.$inferSelect;
export type InsertAiPrediction = typeof aiPredictions.$inferInsert;

/**
 * 賓果遊戲房間表
 * 存儲遊戲房間的基本信息與設定
 */
export const bingoRooms = mysqlTable("bingo_rooms", {
  id: int("id").autoincrement().primaryKey(),
  /** 房間名稱 */
  name: varchar("name", { length: 255 }).notNull(),
  /** 房間描述 */
  description: text("description"),
  /** 房間狀態: waiting(等待中) | playing(進行中) | finished(已結束) */
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  /** 最大參與人數 */
  maxPlayers: int("maxPlayers").default(20).notNull(),
  /** 當前參與人數 */
  currentPlayers: int("currentPlayers").default(0).notNull(),
  /** 房間創建者 ID */
  creatorId: int("creatorId").notNull(),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BingoRoom = typeof bingoRooms.$inferSelect;
export type InsertBingoRoom = typeof bingoRooms.$inferInsert;

/**
 * 賓果遊戲表
 * 存儲每場遊戲的詳細信息
 */
export const bingoGames = mysqlTable("bingo_games", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬房間 ID */
  roomId: int("roomId").notNull(),
  /** 遊戲狀態: waiting(等待中) | playing(進行中) | finished(已結束) */
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  /** 已抽出的號碼序列 JSON 陣列 */
  drawnNumbers: json("drawnNumbers").notNull().$type<number[]>().default([]),
  /** 獲勝者 ID（可能有多個獲勝者） */
  winners: json("winners").notNull().$type<number[]>().default([]),
  /** 遊戲開始時間 */
  startedAt: timestamp("startedAt"),
  /** 遊戲結束時間 */
  finishedAt: timestamp("finishedAt"),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BingoGame = typeof bingoGames.$inferSelect;
export type InsertBingoGame = typeof bingoGames.$inferInsert;

/**
 * 賓果卡表
 * 存儲玩家的 5x5 賓果卡
 */
export const bingoCards = mysqlTable("bingo_cards", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬遊戲 ID */
  gameId: int("gameId").notNull(),
  /** 玩家 ID */
  playerId: int("playerId").notNull(),
  /** 賓果卡號碼 (5x5 = 25 個號碼，JSON 陣列) */
  numbers: json("numbers").notNull().$type<number[]>(),
  /** 已標記的號碼 (JSON 陣列) */
  markedNumbers: json("markedNumbers").notNull().$type<number[]>().default([]),
  /** 是否已賓果 */
  isBingo: int("isBingo").default(0).notNull(),
  /** 賓果時間 */
  bingoTime: timestamp("bingoTime"),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BingoCard = typeof bingoCards.$inferSelect;
export type InsertBingoCard = typeof bingoCards.$inferInsert;

/**
 * 遊戲參與者表
 * 追蹤玩家在遊戲中的參與情況
 */
export const gameParticipants = mysqlTable("game_participants", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬遊戲 ID */
  gameId: int("gameId").notNull(),
  /** 玩家 ID */
  playerId: int("playerId").notNull(),
  /** 參與狀態: joined(已加入) | bingo(已賓果) | left(已離開) */
  status: mysqlEnum("status", ["joined", "bingo", "left"]).default("joined").notNull(),
  /** 加入時間 */
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  /** 離開時間 */
  leftAt: timestamp("leftAt"),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameParticipant = typeof gameParticipants.$inferInsert;

/**
 * 玩家統計表
 * 記錄玩家的遊戲統計數據
 */
export const playerStats = mysqlTable("player_stats", {
  id: int("id").autoincrement().primaryKey(),
  /** 玩家 ID */
  playerId: int("playerId").notNull().unique(),
  /** 總遊戲次數 */
  totalGames: int("totalGames").default(0).notNull(),
  /** 賓果次數 */
  bingoCount: int("bingoCount").default(0).notNull(),
  /** 勝率 (百分比) */
  winRate: int("winRate").default(0).notNull(),
  /** 最佳成績 (最少抽號次數達成賓果) */
  bestScore: int("bestScore"),
  /** 平均抽號次數 */
  averageDraws: int("averageDraws").default(0).notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertPlayerStats = typeof playerStats.$inferInsert;

/**
 * AI 一星策略預測表
 * 存儲各時段的黃金球號碼預測
 */
export const aiStarPredictions = mysqlTable("ai_star_predictions", {
  id: int("id").autoincrement().primaryKey(),
  /** 日期，格式 YYYY-MM-DD */
  dateStr: varchar("dateStr", { length: 10 }).notNull(),
  /** 來源時段（分析此時段的開獎數據），格式 HH */
  sourceHour: varchar("sourceHour", { length: 2 }).notNull(),
  /** 目標時段（預測此時段的開獎），格式 HH */
  targetHour: varchar("targetHour", { length: 2 }).notNull(),
  /** 黃金球號碼 JSON 陣列（1-6 個） */
  goldenBalls: json("goldenBalls").notNull().$type<number[]>(),
  /** 是否手動輸入 */
  isManual: int("isManual").default(0).notNull(),
  /** AI 分析理由 */
  reasoning: text("reasoning"),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiStarPrediction = typeof aiStarPredictions.$inferSelect;
export type InsertAiStarPrediction = typeof aiStarPredictions.$inferInsert;

/**
 * AI API Key 設定表
 * 存儲用戶的 AI API Key
 */
export const aiApiKeys = mysqlTable("ai_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  /** 用戶 ID */
  userId: int("userId").notNull().unique(),
  /** OpenAI API Key */
  openaiKey: varchar("openaiKey", { length: 255 }),
  /** Gemini API Key */
  geminiKey: varchar("geminiKey", { length: 255 }),
  /** 自定義 API 端點（第三方代理服務 Base URL） */
  customBaseUrl: varchar("customBaseUrl", { length: 512 }),
  /** 自定義模型名稱（如 gemini-2.0-flash-lite） */
  customModel: varchar("customModel", { length: 255 }),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiApiKey = typeof aiApiKeys.$inferSelect;
export type InsertAiApiKey = typeof aiApiKeys.$inferInsert;

/**
 * AI 超級獎預測表
 * 存儲各時段的超級獎候選球（10顆）
 */
export const aiSuperPrizePredictions = mysqlTable("ai_super_prize_predictions", {
  id: int("id").autoincrement().primaryKey(),
  /** 日期，格式 YYYY-MM-DD */
  dateStr: varchar("dateStr", { length: 10 }).notNull(),
  /** 來源時段（分析此時段的開獎數據），格式 HH */
  sourceHour: varchar("sourceHour", { length: 2 }).notNull(),
  /** 目標時段（預測此時段的開獎），格式 HH */
  targetHour: varchar("targetHour", { length: 2 }).notNull(),
  /** 超級獎候選球號碼 JSON 陣列（最多 10 個） */
  candidateBalls: json("candidateBalls").notNull().$type<number[]>(),
  /** 是否手動輸入 */
  isManual: int("isManual").default(0).notNull(),
  /** AI 分析理由 */
  reasoning: text("reasoning"),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiSuperPrizePrediction = typeof aiSuperPrizePredictions.$inferSelect;
export type InsertAiSuperPrizePrediction = typeof aiSuperPrizePredictions.$inferInsert;

/**
 * AI 一星驗證紀錄表
 * 存儲每日每時段的推薦球、實際開獎結果、命中情況
 */
export const aiStarVerificationRecords = mysqlTable("ai_star_verification_records", {
  id: int("id").autoincrement().primaryKey(),
  /** 用戶 ID */
  userId: int("userId").notNull(),
  /** 分析日期，格式 YYYY-MM-DD */
  analysisDate: varchar("analysisDate", { length: 10 }).notNull(),
  /** 時段，格式 HH */
  slotHour: varchar("slotHour", { length: 2 }).notNull(),
  /** 推薦的黃金球 JSON 陣列 */
  recommendedBalls: json("recommendedBalls").notNull().$type<number[]>(),
  /** 實際開獎結果 JSON 陣列 */
  actualResult: json("actualResult").$type<number[]>(),
  /** 命中的球數 */
  hitCount: int("hitCount").default(0).notNull(),
  /** 是否命中 (0=未開獎, 1=命中, 2=未命中) */
  hitStatus: int("hitStatus").default(0).notNull(),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiStarVerificationRecord = typeof aiStarVerificationRecords.$inferSelect;
export type InsertAiStarVerificationRecord = typeof aiStarVerificationRecords.$inferInsert;

/**
 * AI 一星命中率統計表
 * 記錄每日的命中率統計
 */
export const aiStarHitRateSummary = mysqlTable("ai_star_hit_rate_summary", {
  id: int("id").autoincrement().primaryKey(),
  /** 用戶 ID */
  userId: int("userId").notNull(),
  /** 分析日期，格式 YYYY-MM-DD */
  analysisDate: varchar("analysisDate", { length: 10 }).notNull(),
  /** 總預測次數 */
  totalPredictions: int("totalPredictions").default(0).notNull(),
  /** 命中次數 */
  totalHits: int("totalHits").default(0).notNull(),
  /** 命中率 (百分比) */
  hitRate: int("hitRate").default(0).notNull(),
  /** 創建時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiStarHitRateSummary = typeof aiStarHitRateSummary.$inferSelect;
export type InsertAiStarHitRateSummary = typeof aiStarHitRateSummary.$inferInsert;
