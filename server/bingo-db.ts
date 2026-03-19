import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  bingoRooms,
  bingoGames,
  bingoCards,
  gameParticipants,
  playerStats,
  type InsertBingoRoom,
  type InsertBingoGame,
  type InsertBingoCard,
  type InsertGameParticipant,
  type InsertPlayerStats,
} from "../drizzle/schema";

/**
 * 創建遊戲房間
 */
export async function createBingoRoom(data: InsertBingoRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bingoRooms).values(data);
  return result;
}

/**
 * 獲取房間詳情
 */
export async function getBingoRoom(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(bingoRooms).where(eq(bingoRooms.id, roomId)).limit(1);
  return result[0] || null;
}

/**
 * 獲取所有房間列表
 */
export async function listBingoRooms(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(bingoRooms)
    .orderBy(desc(bingoRooms.createdAt))
    .limit(limit)
    .offset(offset);
  
  return result;
}

/**
 * 更新房間狀態
 */
export async function updateBingoRoomStatus(roomId: number, status: "waiting" | "playing" | "finished") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(bingoRooms).set({ status }).where(eq(bingoRooms.id, roomId));
}

/**
 * 更新房間玩家數
 */
export async function updateBingoRoomPlayers(roomId: number, currentPlayers: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(bingoRooms).set({ currentPlayers }).where(eq(bingoRooms.id, roomId));
}

/**
 * 創建遊戲
 */
export async function createBingoGame(data: InsertBingoGame) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bingoGames).values(data);
  return result;
}

/**
 * 獲取遊戲詳情
 */
export async function getBingoGame(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(bingoGames).where(eq(bingoGames.id, gameId)).limit(1);
  return result[0] || null;
}

/**
 * 獲取房間的當前遊戲
 */
export async function getCurrentGameInRoom(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(bingoGames)
    .where(and(eq(bingoGames.roomId, roomId), eq(bingoGames.status, "playing")))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 更新遊戲狀態與已抽號碼
 */
export async function updateBingoGame(
  gameId: number,
  data: { status?: "waiting" | "playing" | "finished"; drawnNumbers?: number[]; winners?: number[] }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.drawnNumbers) updateData.drawnNumbers = data.drawnNumbers;
  if (data.winners) updateData.winners = data.winners;
  
  if (data.status === "finished") {
    updateData.finishedAt = new Date();
  } else if (data.status === "playing") {
    updateData.startedAt = new Date();
  }
  
  await db.update(bingoGames).set(updateData).where(eq(bingoGames.id, gameId));
}

/**
 * 生成賓果卡（5x5 隨機號碼）
 */
export function generateBingoCardNumbers(): number[] {
  const numbers: number[] = [];
  const used = new Set<number>();
  
  while (numbers.length < 25) {
    const num = Math.floor(Math.random() * 75) + 1;
    if (!used.has(num)) {
      numbers.push(num);
      used.add(num);
    }
  }
  
  return numbers;
}

/**
 * 創建賓果卡
 */
export async function createBingoCard(data: InsertBingoCard) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bingoCards).values(data);
  return result;
}

/**
 * 獲取玩家的賓果卡
 */
export async function getPlayerBingoCard(gameId: number, playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(bingoCards)
    .where(and(eq(bingoCards.gameId, gameId), eq(bingoCards.playerId, playerId)))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 獲取遊戲中的所有賓果卡
 */
export async function getGameBingoCards(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(bingoCards).where(eq(bingoCards.gameId, gameId));
  return result;
}

/**
 * 標記賓果卡上的號碼
 */
export async function markBingoCardNumber(cardId: number, number: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const card = await db.select().from(bingoCards).where(eq(bingoCards.id, cardId)).limit(1);
  if (!card[0]) throw new Error("Card not found");
  
  const markedNumbers = Array.isArray(card[0].markedNumbers) ? card[0].markedNumbers : [];
  if (!markedNumbers.includes(number)) {
    markedNumbers.push(number);
  }
  
  await db.update(bingoCards).set({ markedNumbers }).where(eq(bingoCards.id, cardId));
}

/**
 * 檢測賓果（橫、直、斜）
 */
export function checkBingo(numbers: number[], markedNumbers: number[]): boolean {
  const grid = [];
  for (let i = 0; i < 5; i++) {
    grid.push(numbers.slice(i * 5, (i + 1) * 5));
  }
  
  // 檢查橫行
  for (let i = 0; i < 5; i++) {
    if (grid[i].every(n => markedNumbers.includes(n))) {
      return true;
    }
  }
  
  // 檢查直行
  for (let j = 0; j < 5; j++) {
    if (grid.every(row => markedNumbers.includes(row[j]))) {
      return true;
    }
  }
  
  // 檢查左上到右下斜線
  if (grid.every((row, i) => markedNumbers.includes(row[i]))) {
    return true;
  }
  
  // 檢查右上到左下斜線
  if (grid.every((row, i) => markedNumbers.includes(row[4 - i]))) {
    return true;
  }
  
  return false;
}

/**
 * 更新賓果卡為已賓果
 */
export async function markCardAsBingo(cardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(bingoCards)
    .set({ isBingo: 1, bingoTime: new Date() })
    .where(eq(bingoCards.id, cardId));
}

/**
 * 添加遊戲參與者
 */
export async function addGameParticipant(data: InsertGameParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(gameParticipants).values(data);
  return result;
}

/**
 * 獲取遊戲參與者
 */
export async function getGameParticipants(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(gameParticipants).where(eq(gameParticipants.gameId, gameId));
  return result;
}

/**
 * 更新參與者狀態
 */
export async function updateParticipantStatus(
  participantId: number,
  status: "joined" | "bingo" | "left"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (status === "left") {
    updateData.leftAt = new Date();
  }
  
  await db.update(gameParticipants).set(updateData).where(eq(gameParticipants.id, participantId));
}

/**
 * 獲取或創建玩家統計
 */
export async function getOrCreatePlayerStats(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db
    .select()
    .from(playerStats)
    .where(eq(playerStats.playerId, playerId))
    .limit(1);
  
  if (existing[0]) {
    return existing[0];
  }
  
  const result = await db.insert(playerStats).values({
    playerId,
    totalGames: 0,
    bingoCount: 0,
    winRate: 0,
    averageDraws: 0,
  });
  
  return result;
}

/**
 * 更新玩家統計
 */
export async function updatePlayerStats(
  playerId: number,
  data: {
    totalGames?: number;
    bingoCount?: number;
    winRate?: number;
    bestScore?: number;
    averageDraws?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.totalGames !== undefined) updateData.totalGames = data.totalGames;
  if (data.bingoCount !== undefined) updateData.bingoCount = data.bingoCount;
  if (data.winRate !== undefined) updateData.winRate = data.winRate;
  if (data.bestScore !== undefined) updateData.bestScore = data.bestScore;
  if (data.averageDraws !== undefined) updateData.averageDraws = data.averageDraws;
  
  await db.update(playerStats).set(updateData).where(eq(playerStats.playerId, playerId));
}

/**
 * 獲取玩家統計
 */
export async function getPlayerStats(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(playerStats)
    .where(eq(playerStats.playerId, playerId))
    .limit(1);
  
  return result[0] || null;
}
