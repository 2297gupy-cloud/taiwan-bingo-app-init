import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createBingoRoom,
  getBingoRoom,
  listBingoRooms,
  updateBingoRoomStatus,
  updateBingoRoomPlayers,
  createBingoGame,
  getBingoGame,
  getCurrentGameInRoom,
  updateBingoGame,
  generateBingoCardNumbers,
  createBingoCard,
  getPlayerBingoCard,
  getGameBingoCards,
  markBingoCardNumber,
  checkBingo,
  markCardAsBingo,
  addGameParticipant,
  getGameParticipants,
  updateParticipantStatus,
  getOrCreatePlayerStats,
  updatePlayerStats,
  getPlayerStats,
} from "./bingo-db";

export const bingoRouter = router({
  // ===== 房間管理 =====
  
  /**
   * 創建遊戲房間
   */
  createRoom: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        maxPlayers: z.number().min(2).max(100).default(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createBingoRoom({
        name: input.name,
        description: input.description,
        maxPlayers: input.maxPlayers,
        creatorId: ctx.user.id,
        status: "waiting",
        currentPlayers: 0,
      });
      return result;
    }),

  /**
   * 獲取房間詳情
   */
  getRoom: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input }) => {
      return getBingoRoom(input.roomId);
    }),

  /**
   * 列出所有房間
   */
  listRooms: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return listBingoRooms(input.limit, input.offset);
    }),

  // ===== 遊戲管理 =====

  /**
   * 開始遊戲
   */
  startGame: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const room = await getBingoRoom(input.roomId);
      if (!room) throw new Error("Room not found");
      if (room.creatorId !== ctx.user.id) throw new Error("Only room creator can start game");
      if (room.currentPlayers < 2) throw new Error("Need at least 2 players");

      const gameResult = await createBingoGame({
        roomId: input.roomId,
        status: "playing",
        drawnNumbers: [],
        winners: [],
      });

      await updateBingoRoomStatus(input.roomId, "playing");

      return gameResult;
    }),

  /**
   * 獲取遊戲詳情
   */
  getGame: publicProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ input }) => {
      return getBingoGame(input.gameId);
    }),

  /**
   * 獲取房間的當前遊戲
   */
  getCurrentGame: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input }) => {
      return getCurrentGameInRoom(input.roomId);
    }),

  /**
   * 抽號
   */
  drawNumber: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const game = await getBingoGame(input.gameId);
      if (!game) throw new Error("Game not found");
      if (game.status !== "playing") throw new Error("Game is not playing");

      const drawnNumbers = Array.isArray(game.drawnNumbers) ? game.drawnNumbers : [];
      const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
        n => !drawnNumbers.includes(n)
      );

      if (availableNumbers.length === 0) throw new Error("All numbers have been drawn");

      const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      drawnNumbers.push(newNumber);

      await updateBingoGame(input.gameId, { drawnNumbers });

      // 檢查是否有人賓果
      const cards = await getGameBingoCards(input.gameId);
      const winners: number[] = [];

      for (const card of cards) {
        if (card.isBingo === 0) {
          const markedNumbers = Array.isArray(card.markedNumbers) ? card.markedNumbers : [];
          const allNumbers = Array.isArray(card.numbers) ? card.numbers : [];

          if (allNumbers.includes(newNumber)) {
            markedNumbers.push(newNumber);

            if (checkBingo(allNumbers, markedNumbers)) {
              await markCardAsBingo(card.id);
              winners.push(card.playerId);
            } else {
              // 更新已標記的號碼
              await markBingoCardNumber(card.id, newNumber);
            }
          }
        }
      }

      if (winners.length > 0) {
        await updateBingoGame(input.gameId, { winners });
      }

      return {
        drawnNumber: newNumber,
        drawnNumbers,
        winners,
      };
    }),

  /**
   * 結束遊戲
   */
  finishGame: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const game = await getBingoGame(input.gameId);
      if (!game) throw new Error("Game not found");

      await updateBingoGame(input.gameId, { status: "finished" });

      // 更新房間狀態
      const room = await getBingoRoom(game.roomId);
      if (room && room.creatorId === ctx.user.id) {
        await updateBingoRoomStatus(game.roomId, "finished");
      }

      return { success: true };
    }),

  // ===== 賓果卡管理 =====

  /**
   * 玩家加入遊戲並領取賓果卡
   */
  joinGame: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const game = await getBingoGame(input.gameId);
      if (!game) throw new Error("Game not found");
      if (game.status !== "waiting") throw new Error("Game is not accepting players");

      // 檢查玩家是否已加入
      const participants = await getGameParticipants(input.gameId);
      const alreadyJoined = participants.some(p => p.playerId === ctx.user.id);
      if (alreadyJoined) throw new Error("Player already joined");

      // 添加參與者
      await addGameParticipant({
        gameId: input.gameId,
        playerId: ctx.user.id,
        status: "joined",
      });

      // 生成賓果卡
      const cardNumbers = generateBingoCardNumbers();
      await createBingoCard({
        gameId: input.gameId,
        playerId: ctx.user.id,
        numbers: cardNumbers,
        markedNumbers: [],
        isBingo: 0,
      });

      // 更新房間玩家數
      const room = await getBingoRoom(game.roomId);
      if (room) {
        await updateBingoRoomPlayers(game.roomId, room.currentPlayers + 1);
      }

      // 獲取剛創建的賓果卡
      const card = await getPlayerBingoCard(input.gameId, ctx.user.id);

      return {
        cardId: card?.id,
        cardNumbers,
      };
    }),

  /**
   * 獲取玩家的賓果卡
   */
  getMyCard: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getPlayerBingoCard(input.gameId, ctx.user.id);
    }),

  /**
   * 獲取遊戲中的所有賓果卡
   */
  getGameCards: publicProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ input }) => {
      return getGameBingoCards(input.gameId);
    }),

  // ===== 統計分析 =====

  /**
   * 獲取玩家統計
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getPlayerStats(ctx.user.id);
    if (!stats) {
      await getOrCreatePlayerStats(ctx.user.id);
      return getPlayerStats(ctx.user.id);
    }
    return stats;
  }),

  /**
   * 獲取玩家統計（指定玩家）
   */
  getPlayerStats: publicProcedure
    .input(z.object({ playerId: z.number() }))
    .query(async ({ input }) => {
      return getPlayerStats(input.playerId);
    }),
});
