import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
import { bingoRouter } from "./bingo-router";

export const appRouter = router({
  system: systemRouter,
  bingo: bingoRouter,
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
});

export type AppRouter = typeof appRouter;
