import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestDraw,
  getRecentDraws,
  getDrawHistory,
  getDrawStats,
  checkNumbers,
  getLatestPrediction,
  getRecentPredictions,
} from "./db";
import { taiwanBingoV2Config, exportUIConfigAsJSON } from "./ui-config-export";
import {
  createBingoRoom,
  listBingoRooms,
  getBingoRoom,
  createBingoGame,
  getBingoGame,
  getPlayerBingoCard,
  addGameParticipant,
  getPlayerStats,
} from "./bingo-db";
import { backupCsvRouter } from "./backup-csv-router";
import { syncRecentDays, syncBingoDataForDate, getTaiwanDateStr } from "./services/taiwan-lottery-api";
import { resetAPIMode, getTodayDrawSchedule, getCurrentDrawIndex } from "./services/live-draw-simulator";
import { generateAIPrediction } from "./services/ai-predictor";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  draw: router({
    /** 取得最新一期開獎 */
    latest: publicProcedure.query(async () => {
      return getLatestDraw();
    }),

    /** 取得最近 N 期開獎 */
    recent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(20) }))
      .query(async ({ input }) => {
        return getRecentDraws(input.limit);
      }),

    /** 歷史開獎記錄（分頁） */
    history: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        return getDrawHistory(input.page, input.pageSize);
      }),
  }),

  stats: router({
    /** 取得統計數據 */
    summary: publicProcedure
      .input(z.object({ periods: z.number().min(1).max(200).default(20) }))
      .query(async ({ input }) => {
        return getDrawStats(input.periods);
      }),
  }),

  prediction: router({
    /** 取得最新 AI 預測 */
    latest: publicProcedure.query(async () => {
      return getLatestPrediction();
    }),

    /** 取得近期預測記錄 */
    recent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ input }) => {
        return getRecentPredictions(input.limit);
      }),

    /** 生成 AI 智能預測分析 */
    analyze: publicProcedure
      .input(z.object({
        drawNumber: z.string(),
        samplePeriods: z.number().min(10).max(200).default(30),
      }))
      .query(async ({ input }) => {
        return generateAIPrediction(input.drawNumber, input.samplePeriods);
      }),
  }),

  checker: router({
    /** 對獎 */
    check: publicProcedure
      .input(z.object({
        numbers: z.array(z.number().min(1).max(80)).min(1).max(20),
        drawNumber: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return checkNumbers(input.numbers, input.drawNumber);
      }),
  }),

  /** UI 配置管理 */
  uiConfig: router({
    /** 獲取台灣賓果 V2 完整 UI 配置 */
    getTaiwanBingoV2: publicProcedure.query(async () => {
      return taiwanBingoV2Config;
    }),

    /** 匯出 UI 配置為 JSON */
    exportAsJSON: publicProcedure.query(async () => {
      return {
        json: exportUIConfigAsJSON(taiwanBingoV2Config),
        timestamp: new Date().toISOString(),
      };
    }),

    /** 獲取 UI 配置摘要 */
    getSummary: publicProcedure.query(async () => {
      return {
        name: taiwanBingoV2Config.name,
        version: taiwanBingoV2Config.version,
        appType: taiwanBingoV2Config.appType,
        description: taiwanBingoV2Config.description,
        pageCount: taiwanBingoV2Config.pagesConfig.length,
        navigationItemCount: taiwanBingoV2Config.navigationConfig.items.length,
        apiEndpointCount: taiwanBingoV2Config.apiConfig.endpoints.length,
        databaseTableCount: taiwanBingoV2Config.databaseConfig.tables.length,
      };
    }),
  }),

  /** 賓果遊戲系統 */
  bingo: router({
    /** 創建遊戲房間 */
    createRoom: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        maxPlayers: z.number().min(2).max(100).default(20),
      }))
      .mutation(async ({ input, ctx }) => {
        return createBingoRoom({
          name: input.name,
          description: input.description,
          maxPlayers: input.maxPlayers,
          creatorId: ctx.user.id,
        });
      }),

    /** 列表遊戲房間 */
    listRooms: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return listBingoRooms(input.limit, input.offset);
      }),

    /** 獲取房間詳情 */
    getRoom: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return getBingoRoom(input.roomId);
      }),

    /** 加入房間 */
    joinRoom: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return addGameParticipant({
          gameId: 0,
          playerId: ctx.user.id,
          status: "joined",
        });
      }),

    /** 開始遊戲 */
    startGame: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input }) => {
        return createBingoGame({
          roomId: input.roomId,
          status: "playing",
          drawnNumbers: [],
          winners: [],
        });
      }),

    /** 獲取遊戲詳情 */
    getGame: publicProcedure
      .input(z.object({ gameId: z.number() }))
      .query(async ({ input }) => {
        return getBingoGame(input.gameId);
      }),

    /** 獲取我的賓果卡 */
    getMyCard: protectedProcedure
      .input(z.object({ gameId: z.number() }))
      .query(async ({ input, ctx }) => {
        return getPlayerBingoCard(input.gameId, ctx.user.id);
      }),

    /** 獲取玩家統計 */
    getPlayerStats: protectedProcedure
      .query(async ({ ctx }) => {
        return getPlayerStats(ctx.user.id);
      }),
  }),

  backup: backupCsvRouter,

  /** 台彩數據同步管理 */
  sync: router({
    /** 手動同步今天數據 */
    today: protectedProcedure.mutation(async () => {
      const dateStr = getTaiwanDateStr();
      const result = await syncBingoDataForDate(dateStr);
      resetAPIMode();
      return { success: true, ...result };
    }),

    /** 手動同步最近 N 天數據（最多 30 天） */
    recentDays: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(30).default(30) }))
      .mutation(async ({ input }) => {
        const result = await syncRecentDays(input.days);
        resetAPIMode();
        return { success: true, ...result };
      }),

    /** 手動同步指定日期數據 */
    byDate: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(async ({ input }) => {
        const result = await syncBingoDataForDate(input.date);
        return { success: true, ...result };
      }),

    /** 取得今日開獎時間表 */
    schedule: publicProcedure.query(() => {
      const schedule = getTodayDrawSchedule();
      const currentIndex = getCurrentDrawIndex();
      return {
        schedule,
        currentIndex,
        totalPeriods: 204,
        firstDraw: '07:05',
        lastDraw: '23:55',
        intervalMinutes: 5,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
