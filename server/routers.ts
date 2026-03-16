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
  getDb,
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
import {
  HOUR_SLOTS,
  getCurrentSlot,
  getTodayDateStr,
  analyzeHourSlot,
  getHourDraws,
  getAiStarPredictions,
  saveAiStarPrediction,
  deleteAiStarPrediction,
  verifyPrediction,
  getFormattedHourData,
  batchAnalyzeAllSlots,
  batchAnalyzeSuperPrizeSlots,
  getAnalysisRecords,
  analyzeSuperPrizeSlot,
  getAiSuperPrizePredictions,
  saveAiSuperPrizePrediction,
  deleteAiSuperPrizePrediction,
  getHourDrawsWithSuper,
  verifySuperPrizePrediction,
  analyzeCustomData,
  parseRawDrawData,
} from "./services/ai-star-strategy";
import { aiApiKeys, drawRecords } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { predictNumbers, type PredictStrategy } from "./services/number-predictor";
import { validateApiKey, validateCustomApiKey, validateGeminiKey } from "./api-key-validator";
import { manualCheckUserApiKey } from "./api-key-monitor";


export const appRouter = router({
  // API Key 監控路由
  apiKey: router({
    checkStatus: protectedProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const result = await manualCheckUserApiKey(input);
        return result;
      }),
  }),

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

  /** AI 一星策略 */
  aiStar: router({
    /** 取得時段配置和當前時段 */
    getSlots: publicProcedure.query(() => {
      const currentSlotInfo = getCurrentSlot();
      const dateStr = getTodayDateStr();
      return {
        slots: HOUR_SLOTS,
        currentSlot: currentSlotInfo,
        dateStr,
      };
    }),

    /** 取得指定日期的所有預測 */
    getPredictions: publicProcedure
      .input(z.object({ dateStr: z.string().optional() }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getAiStarPredictions(dateStr);
      }),

    /** AI 自動分析指定時段 */
    analyze: protectedProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        const slot = HOUR_SLOTS.find(s => s.source === input.sourceHour);
        if (!slot) throw new Error("時段不存在");
        // 讀取用戶儲存的 APIKey 和自訂設定
        const db = await getDb();
        let userApiKey: string | null | undefined;
        let customBaseUrl: string | null | undefined;
        let customModel: string | null | undefined;
        if (db) {
          const keyRows = await db.select().from(aiApiKeys).where(eq(aiApiKeys.userId, ctx.user.id)).limit(1);
          if (keyRows.length > 0) {
            userApiKey = keyRows[0].openaiKey || keyRows[0].geminiKey || null;
            customBaseUrl = keyRows[0].customBaseUrl || null;
            customModel = keyRows[0].customModel || null;
          }
        }
        const result = await analyzeHourSlot(dateStr, input.sourceHour, userApiKey, customBaseUrl, customModel);
        await saveAiStarPrediction(
          dateStr,
          input.sourceHour,
          slot.target,
          result.goldenBalls,
          false,
          result.reasoning
        );
        return { ...result, dateStr, sourceHour: input.sourceHour, targetHour: slot.target };
      }),

    /** 手動輸入黃金球號碼 */
    saveManual: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
        goldenBalls: z.array(z.number().min(1).max(80)).min(1).max(10),
      }))
      .mutation(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        const slot = HOUR_SLOTS.find(s => s.source === input.sourceHour);
        if (!slot) throw new Error("時段不存在");
        await saveAiStarPrediction(
          dateStr,
          input.sourceHour,
          slot.target,
          input.goldenBalls,
          true,
          "手動輸入"
        );
        return { success: true };
      }),

    /** 刪除指定時段預測 */
    deletePrediction: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
      }))
      .mutation(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        await deleteAiStarPrediction(dateStr, input.sourceHour);
        return { success: true };
      }),

    /** 驗證預測結果
     * verifyHour: 實際驗證的時段（卡片顯示時段+1）
     * 例：08時卡片的黃金球 → verifyHour="09" → 驗證 09:00~09:55
     */
    verify: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        verifyHour: z.string(),
        goldenBalls: z.array(z.number().min(1).max(80)),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return verifyPrediction(dateStr, input.verifyHour, input.goldenBalls);
      }),

    /** 取得時段開獎數據（用於複製到 AI） */
    getHourData: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
        copyRange: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getFormattedHourData(dateStr, input.sourceHour, input.copyRange);
      }),

    /** 取得時段開獎數據列表 */
    getHourDraws: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        targetHour: z.string(),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getHourDraws(dateStr, input.targetHour);
      }),

    /** 取得用戶 API Key 設定 */
    getApiKey: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { openaiKey: null, geminiKey: null, customBaseUrl: null, customModel: null };
      const rows = await db.select().from(aiApiKeys).where(eq(aiApiKeys.userId, ctx.user.id)).limit(1);
      if (rows.length === 0) return { openaiKey: null, geminiKey: null, customBaseUrl: null, customModel: null };
      return {
        openaiKey: rows[0].openaiKey ? rows[0].openaiKey.substring(0, 10) + "..." : null,
        geminiKey: rows[0].geminiKey ? rows[0].geminiKey.substring(0, 10) + "..." : null,
        customBaseUrl: rows[0].customBaseUrl || null,
        customModel: rows[0].customModel || null,
      };
    }),

    /** 批量分析所有時段 */
    batchAnalyze: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return batchAnalyzeAllSlots(dateStr);
      }),

    /** 取得近 N 天的分析記錄 */
    getAnalysisRecords: publicProcedure
      .input(z.object({
        days: z.number().min(1).max(30).default(7),
      }))
      .query(async ({ input }) => {
        return getAnalysisRecords(input.days);
      }),

    /** 儲存用戶 API Key */
    saveApiKey: protectedProcedure
      .input(z.object({
        openaiKey: z.string().optional(),
        geminiKey: z.string().optional(),
        customBaseUrl: z.string().url().optional().or(z.literal("")),
        customModel: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("資料庫不可用");
        
        // 驗證 API Key
        const validationErrors: string[] = [];
        
        // 如果有自定義 Base URL，使用代理端點驗證 Key
        const customBaseUrl = input.customBaseUrl || undefined;
        const customModel = input.customModel || undefined;
        
        if (input.openaiKey) {
          if (customBaseUrl) {
            // 有自訂 Base URL 時，使用代理端點驗證
            const validation = await validateCustomApiKey(input.openaiKey, customBaseUrl, customModel);
            if (!validation.valid) {
              validationErrors.push(`API Key 驗證失敗：${validation.error}`);
            }
          } else if (input.openaiKey.startsWith("AIza")) {
            // AIza 格式但放入 openaiKey 欄位（不應發生，但防御）
            const validation = await validateGeminiKey(input.openaiKey);
            if (!validation.valid) {
              validationErrors.push(`API Key 驗證失敗：${validation.error}`);
            }
          }
          // 沒有 customBaseUrl 且是 sk- 格式：跳過驗證，直接儲存
          // （第三方代理 Key 可能是 sk- 格式但不能用 OpenAI 端點驗證）
        }
        
        if (input.geminiKey) {
          if (customBaseUrl) {
            // 有自訂 Base URL 時，使用代理端點驗證
            const validation = await validateCustomApiKey(input.geminiKey, customBaseUrl, customModel);
            if (!validation.valid) {
              validationErrors.push(`Gemini Key 驗證失敗：${validation.error}`);
            }
          } else {
            // 沒有 customBaseUrl，用原生 Gemini API 驗證
            const validation = await validateGeminiKey(input.geminiKey);
            if (!validation.valid) {
              validationErrors.push(`Gemini Key 驗證失敗：${validation.error}`);
            }
          }
        }
        
        // 如果驗證失敗，拋出錯誤
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join("; "));
        }
        
        const existing = await db.select().from(aiApiKeys).where(eq(aiApiKeys.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db.update(aiApiKeys).set({
            openaiKey: input.openaiKey || null,
            geminiKey: input.geminiKey || null,
            customBaseUrl: input.customBaseUrl || null,
            customModel: input.customModel || null,
          }).where(eq(aiApiKeys.userId, ctx.user.id));
        } else {
          await db.insert(aiApiKeys).values({
            userId: ctx.user.id,
            openaiKey: input.openaiKey || null,
            geminiKey: input.geminiKey || null,
            customBaseUrl: input.customBaseUrl || null,
            customModel: input.customModel || null,
          });
        }
        return { success: true };
      }),
    /** 取得時段開獎（含 superNumber），用於數字分布矩陣 */
    getHourDrawsWithSuper: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        targetHour: z.string(),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getHourDrawsWithSuper(dateStr, input.targetHour);
      }),
    /** 貧入開獎數據進行 AI 演算（支援自訂數據） */
    /** 貧入開獎數據進行 AI 演算（完整實現） */
    analyzeCustomDataFull: publicProcedure
      .input(z.object({
        rawText: z.string().min(10, "請輸入開獎數據"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 取得用戶 API Key
        let userApiKey: string | null = null;
        let customBaseUrl: string | null = null;
        let customModel: string | null = null;
        if (ctx.user) {
          const database = await getDb();
          if (database) {
            const keyRecord = await database
              .select()
              .from(aiApiKeys)
              .where(eq(aiApiKeys.userId, ctx.user.id))
              .limit(1);
            if (keyRecord.length > 0) {
              userApiKey = keyRecord[0].openaiKey || keyRecord[0].geminiKey || null;
              customBaseUrl = keyRecord[0].customBaseUrl || null;
              customModel = keyRecord[0].customModel || null;
            }
          }
        }
        return analyzeCustomData(input.rawText, userApiKey, customBaseUrl, customModel);
      }),
  }),
  /** AI 超級獎預測 */
  aiSuperPrize: router({
    /** 取得時段配置和當前時段 */
    getSlots: publicProcedure.query(() => {
      const currentSlotInfo = getCurrentSlot();
      const dateStr = getTodayDateStr();
      return { slots: HOUR_SLOTS, currentSlot: currentSlotInfo, dateStr };
    }),
    /** 取得指定日期的所有超級獎預測 */
    getPredictions: publicProcedure
      .input(z.object({ dateStr: z.string().optional() }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getAiSuperPrizePredictions(dateStr);
      }),
    /** AI 分析超級獎候選球（10顆） */
    analyze: protectedProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
        targetHour: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        // 讀取用戶儲存的 APIKey 和自訂設定
        const db = await getDb();
        let userApiKey: string | null | undefined;
        let customBaseUrl: string | null | undefined;
        let customModel: string | null | undefined;
        if (db) {
          const keyRows = await db.select().from(aiApiKeys).where(eq(aiApiKeys.userId, ctx.user.id)).limit(1);
          if (keyRows.length > 0) {
            userApiKey = keyRows[0].openaiKey || keyRows[0].geminiKey || null;
            customBaseUrl = keyRows[0].customBaseUrl || null;
            customModel = keyRows[0].customModel || null;
          }
        }
        const result = await analyzeSuperPrizeSlot(dateStr, input.sourceHour, userApiKey, customBaseUrl, customModel);
        await saveAiSuperPrizePrediction(dateStr, input.sourceHour, input.targetHour, result.candidateBalls, false, result.reasoning);
        return { ...result, dateStr, sourceHour: input.sourceHour, targetHour: input.targetHour };
      }),
    /** 手動儲存超級獎候選球 */
    saveManual: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
        targetHour: z.string(),
        candidateBalls: z.array(z.number().min(1).max(80)).min(1).max(10),
      }))
      .mutation(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        await saveAiSuperPrizePrediction(dateStr, input.sourceHour, input.targetHour, input.candidateBalls, true);
        return { success: true };
      }),
    /** 刪除超級獎預測 */
    deletePrediction: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
      }))
      .mutation(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        await deleteAiSuperPrizePrediction(dateStr, input.sourceHour);
        return { success: true };
      }),
    /** 驗證超級獎預測結果 */
    verify: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        verifyHour: z.string(),
        candidateBalls: z.array(z.number().min(1).max(80)),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return verifySuperPrizePrediction(dateStr, input.verifyHour, input.candidateBalls);
      }),
    /** 取得時段格式化數據（用於超級獎 AI 分析文本） */
    getHourData: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        sourceHour: z.string(),
        copyRange: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return getFormattedHourData(dateStr, input.sourceHour, input.copyRange);
      }),
    /** 批量分析所有時段的超級獎候選球 */
    batchAnalyze: protectedProcedure
      .input(z.object({ dateStr: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        // 讀取用戶儲存的 APIKey 和自訂設定
        const db = await getDb();
        let userApiKey: string | null | undefined;
        let customBaseUrl: string | null | undefined;
        let customModel: string | null | undefined;
        if (db) {
          const keyRows = await db.select().from(aiApiKeys).where(eq(aiApiKeys.userId, ctx.user.id)).limit(1);
          if (keyRows.length > 0) {
            userApiKey = keyRows[0].openaiKey || keyRows[0].geminiKey || null;
            customBaseUrl = keyRows[0].customBaseUrl || null;
            customModel = keyRows[0].customModel || null;
          }
        }
        return batchAnalyzeSuperPrizeSlots(dateStr, userApiKey, customBaseUrl, customModel);
      }),
  }),

  /** 台彩數據同步管理 */
  sync: router({
    /** 手動同步今天數據 */
    today: publicProcedure.mutation(async () => {
      const dateStr = getTaiwanDateStr();
      const result = await syncBingoDataForDate(dateStr);
      resetAPIMode();
      return { success: true, ...result };
    }),

    /** 手動同步最近 N 天數據（最多 30 天） */
    recentDays: publicProcedure
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

    /** 數據完整度檢查：列出最近 N 天每天的筆數 */
    dataIntegrity: publicProcedure
      .input(z.object({ days: z.number().min(1).max(30).default(30) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { days: [] };

        const results: Array<{ date: string; count: number; expected: number; missing: boolean }> = [];
        const today = new Date();

        for (let i = 0; i < input.days; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = getTaiwanDateStr(d);
          // 民國年格式前綴，例如 115/03/15
          const rocYear = d.getFullYear() - 1911;
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const rocPrefix = `${rocYear}/${mm}/${dd}`;

          // 計算當天資料庫中的筆數
          const rows = await db
            .select({ drawTime: drawRecords.drawTime })
            .from(drawRecords)
            .where(sql`${drawRecords.drawTime} LIKE ${rocPrefix + '%'}`);

          const count = rows.length;
          // 賓果賓果每天 204 期（07:05 ~ 23:55，每 5 分鐘一期）
          const expected = 204;
          results.push({
            date: dateStr,
            count,
            expected,
            missing: count < expected * 0.9, // 少於 90% 視為缺漏
          });
        }

        return { days: results };
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

  /** 號碼預測模組 */
  numberPredict: router({
    /** 執行號碼預測 */
    predict: publicProcedure
      .input(z.object({
        strategy: z.enum(["hot", "cold", "balanced", "weighted", "overdue", "custom"]),
        periods: z.number().min(1).max(20).default(5),
        count: z.number().min(1).max(10).default(5),
        customNumbers: z.array(z.number().min(1).max(80)).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await predictNumbers(
          input.strategy as PredictStrategy,
          input.periods,
          input.count,
          input.customNumbers
        );
        return result;
      }),

    /** 取得熱號冷號統計（用於展示） */
    stats: publicProcedure
      .input(z.object({
        periods: z.number().min(1).max(20).default(10),
      }))
      .query(async ({ input }) => {
        const result = await predictNumbers("hot", input.periods, 10);
        return {
          hotNumbers: result.hotNumbers,
          coldNumbers: result.coldNumbers,
          frequencyMap: result.frequencyMap,
          lastSeenMap: result.lastSeenMap,
          totalPeriods: result.totalPeriods,
        };
      }),

    /** 計算每個策略過去十期的平均命中率 */
    strategyHitRates: publicProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return null;

        const records = await db
          .select()
          .from(drawRecords)
          .orderBy(desc(drawRecords.drawTime))
          .limit(10);

        if (records.length === 0) return null;

        const strategies = ["hot", "cold", "balanced", "weighted", "overdue"] as const;
        const hitRates: Record<string, number> = {};

        for (const strategy of strategies) {
          let hitCount = 0;
          for (const record of records) {
            const prediction = await predictNumbers(strategy, 5, 5);
            const predictedNums = new Set(prediction.numbers);
            const actualNums = new Set(record.numbers as number[]);
            let hits = 0;
            predictedNums.forEach((num) => {
              if (actualNums.has(num)) hits++;
            });
            if (hits >= 3) hitCount++;
          }
          hitRates[strategy] = Math.round((hitCount / records.length) * 100);
        }
        return hitRates;
      }),
  }),
});
export type AppRouter = typeof appRouter;
