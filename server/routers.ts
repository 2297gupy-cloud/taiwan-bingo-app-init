import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestPeriod,
  getLatestDraws,
  getDrawsByDate,
  getDrawsByRange,
  getSummary,
  getDrawByPeriod,
} from "./google-api";

// 開獎數據路由
const drawRouter = router({
  checkLatest: publicProcedure.query(async () => {
    try {
      const latestPeriod = await getLatestPeriod();
      return {
        success: true,
        data: {
          latestPeriod,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error('[Draw Router] 檢查最新期別失敗:', error);
      return {
        success: false,
        error: '無法獲取最新期別',
      };
    }
  }),

  latest: publicProcedure
    .input(z.object({ n: z.number().min(1).max(20).default(3) }))
    .query(async ({ input }) => {
      try {
        const draws = await getLatestDraws(input.n);
        return {
          success: true,
          data: draws,
        };
      } catch (error) {
        console.error('[Draw Router] 獲取最新開獎失敗:', error);
        return {
          success: false,
          error: '無法獲取最新開獎',
          data: [],
        };
      }
    }),

  byDate: publicProcedure
    .input(z.object({ dateStr: z.string() }))
    .query(async ({ input }) => {
      try {
        const draws = await getDrawsByDate(input.dateStr);
        return {
          success: true,
          data: draws,
        };
      } catch (error) {
        console.error('[Draw Router] 獲取日期開獎失敗:', error);
        return {
          success: false,
          error: '無法獲取指定日期的開獎',
          data: [],
        };
      }
    }),

  byRange: publicProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const draws = await getDrawsByRange(input.fromDate, input.toDate);
        return {
          success: true,
          data: draws,
        };
      } catch (error) {
        console.error('[Draw Router] 獲取範圍開獎失敗:', error);
        return {
          success: false,
          error: '無法獲取日期範圍的開獎',
          data: [],
        };
      }
    }),

  byPeriod: publicProcedure
    .input(z.object({ period: z.string() }))
    .query(async ({ input }) => {
      try {
        const draw = await getDrawByPeriod(input.period);
        return {
          success: draw !== null,
          data: draw,
        };
      } catch (error) {
        console.error('[Draw Router] 獲取期別失敗:', error);
        return {
          success: false,
          error: '無法獲取指定期別',
          data: null,
        };
      }
    }),

  summary: publicProcedure.query(async () => {
    try {
      const summary = await getSummary();
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error('[Draw Router] 獲取摘要失敗:', error);
      return {
        success: false,
        error: '無法獲取摘要',
        data: {},
      };
    }
  }),
});

// 認證路由
const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (!ctx?.user) {
      return null;
    }
    // @ts-ignore
    return ctx.user;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    return { success: true };
  }),
});

// 外部 API 路由
const externalRouter = router({
  getLatestDraws: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      try {
        const draws = await getLatestDraws(input.limit);
        return {
          success: true,
          data: draws,
        };
      } catch (error) {
        console.error('[External API] 獲取最新開獎失敗:', error);
        return {
          success: false,
          error: '無法獲取最新開獎',
          data: [],
        };
      }
    }),

  getSummary: publicProcedure.query(async () => {
    try {
      const summary = await getSummary();
      const latest = await getLatestDraws(3);
      return {
        success: true,
        data: {
          summary,
          latestDraws: latest,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error('[External API] 獲取綜合數據失敗:', error);
      return {
        success: false,
        error: '無法獲取綜合數據',
        data: null,
      };
    }
  }),
});

// 主路由
export const appRouter = router({
  draw: drawRouter,
  auth: authRouter,
  external: externalRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
