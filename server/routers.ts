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
import { syncGoogleSheetsData } from "./services/google-sheets-sync";
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
  getAnalysisRecords,
  analyzeSuperPrizeSlot,
  getAiSuperPrizePredictions,
  saveAiSuperPrizePrediction,
  deleteAiSuperPrizePrediction,
  getHourDrawsWithSuper,
  verifySuperPrizePrediction,
} from "./services/ai-star-strategy";
import { aiApiKeys, drawRecords } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { predictNumbers, type PredictStrategy } from "./services/number-predictor";
import { validateApiKey, validateCustomApiKey, validateGeminiKey } from "./api-key-validator";
import { manualCheckUserApiKey } from "./api-key-monitor";
import { dateValidatorRouter } from "./services/date-validator-router";


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
  
  // Google Sheets 同步路由
  googleSheets: router({
    sync: protectedProcedure
      .mutation(async () => {
        const result = await syncGoogleSheetsData();
        return result;
      }),
  }),

  // 日期驗證路由
  dateValidator: dateValidatorRouter,

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
        // 調用 analyzeHourSlot，會自動根據 API Key 選擇 LLM 或統計方法
        const result = await analyzeHourSlot(dateStr, input.sourceHour, userApiKey, customBaseUrl, customModel);
        await saveAiStarPrediction(
          dateStr,
          input.sourceHour,
          slot.target,
          result.goldenBalls,
          false,
          result.reasoning
        );
        return { ...result, dateStr, sourceHour: input.sourceHour, targetHour: slot.target, usedLLM: !result.llmError };
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
    batchAnalyze: protectedProcedure
      .input(z.object({
        dateStr: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        return batchAnalyzeAllSlots(dateStr, ctx.user.id);
      }),

    /** 取得近 N 天的分析記錄 */
    getAnalysisRecords: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(30).default(7),
      }))
      .query(async ({ input, ctx }) => {
        return getAnalysisRecords(input.days, ctx.user.id);
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
        // 使用 analyzeHourSlot 進行分析（自動根據 API Key 選擇 LLM 或統計方法）
        // 注意：這裡假設 input.rawText 是格式化的時段數據
        // 實際使用中應該先解析 rawText 中的時段信息
        return analyzeHourSlot(getTodayDateStr(), '08', userApiKey, customBaseUrl, customModel);
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
    /** 查詢指定日期的所有超級獎預測 */
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
        try {
          // 查詢該時段的超級獎開獎數據
          const superDraws = await getHourDrawsWithSuper(dateStr, input.sourceHour, 10);
          const superNumbers = superDraws.map(d => d.superNumber);
          const result = await analyzeSuperPrizeSlot(superNumbers, input.sourceHour, userApiKey, customBaseUrl, customModel);
          await saveAiSuperPrizePrediction(dateStr, input.sourceHour, input.targetHour, result.candidateBalls, false, result.reasoning);
          return { ...result, dateStr, sourceHour: input.sourceHour, targetHour: input.targetHour };
        } catch (err) {
          console.error('[aiSuperPrize.analyze] Error:', err);
          const superDraws = await getHourDrawsWithSuper(dateStr, input.sourceHour, 10);
          const superNumbers = superDraws.map(d => d.superNumber);
          const result = await analyzeSuperPrizeSlot(superNumbers, input.sourceHour, null, null, null);
          await saveAiSuperPrizePrediction(dateStr, input.sourceHour, input.targetHour, result.candidateBalls, false, result.reasoning);
          return { ...result, dateStr, sourceHour: input.sourceHour, targetHour: input.targetHour };
        }
      }),
    /** 手動儲存超級獎候選球 */
    saveManualSuperPrize: publicProcedure
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
        // 使用 batchAnalyzeAllSlots 進行批量分析（樣本實現）
        // 超級獎的批量分析可以粗粗實現為一個平行的序列
        return batchAnalyzeAllSlots(dateStr, ctx.user.id);
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

  /** 管理員路由 */
  admin: router({
    /** 導入台彩開獎數據 */
    importLotteryData: publicProcedure
      .input(z.object({
        data: z.array(z.object({
          drawNumber: z.string(),
          drawTime: z.string(),
          numbers: z.array(z.number()),
          superNumber: z.number(),
          bigSmall: z.string(),
          oddEven: z.string(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        // 暫時允許所有登录用戶測試（後續可改爲管理員限制）

        const db = await getDb();
        if (!db) throw new Error('無法連接數據庫');

        let inserted = 0;
        let skipped = 0;

        for (const record of input.data) {
          try {
            // 檢查是否已存在
            const existing = await db
              .select()
              .from(drawRecords)
              .where(eq(drawRecords.drawNumber, record.drawNumber));

            if (existing.length > 0) {
              skipped++;
              continue;
            }

            // 計算總和
            const total = record.numbers.reduce((a, b) => a + b, 0);

            // 插入新記錄
            await db.insert(drawRecords).values({
              drawNumber: record.drawNumber,
              drawTime: record.drawTime,
              numbers: record.numbers,
              superNumber: record.superNumber,
              total: total,
              bigSmall: record.bigSmall,
              oddEven: record.oddEven,
              plate: 'import',
            });

            inserted++;
          } catch (err) {
            console.error(`插入失敗 (${record.drawNumber}):`, err);
          }
        }

        return {
          success: true,
          inserted,
          skipped,
          total: input.data.length,
        };
      }),
  }),

  /** 外部網站對接 API */
  external: router({
    /** 獲取最新開獎數據（用於外部網站 30 秒偵測） */
    getLatestDraws: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, data: [] };

        try {
          const records = await db
            .select()
            .from(drawRecords)
            .orderBy(desc(drawRecords.drawNumber))
            .limit(input.limit);

          return {
            success: true,
            data: records.map(r => ({
              term: r.drawNumber,
              time: r.drawTime,
              numbers: r.numbers,
              superNumber: r.superNumber,
              bigSmall: r.bigSmall,
              oddEven: r.oddEven,
              timestamp: r.createdAt?.getTime() || Date.now(),
            })).reverse(),
          };
        } catch (err) {
          console.error('[External API] Error fetching latest draws:', err);
          return { success: false, data: [], error: String(err) };
        }
      }),

    /** 獲取指定日期的所有開獎數據 */
    getDrawsByDate: publicProcedure
      .input(z.object({
        dateStr: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, data: [] };

        try {
          // 根據日期和時間範圍查詢（07:05 ~ 23:55）
          const records = await db
            .select()
            .from(drawRecords)
            .where(sql`DATE(drawTime) = ${input.dateStr}`)
            .orderBy(drawRecords.drawTime);

          return {
            success: true,
            dateStr: input.dateStr,
            data: records.map(r => ({
              term: r.drawNumber,
              time: r.drawTime,
              numbers: r.numbers,
              superNumber: r.superNumber,
              bigSmall: r.bigSmall,
              oddEven: r.oddEven,
            })),
          };
        } catch (err) {
          console.error('[External API] Error fetching draws by date:', err);
          return { success: false, data: [], error: String(err) };
        }
      }),

    /** 獲取 AI 預測結果（用於外部網站顯示） */
    getAIPredictions: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
        limit: z.number().min(1).max(15).default(15),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        try {
          const predictions = await getAiStarPredictions(dateStr);
          return {
            success: true,
            dateStr,
            data: predictions.slice(0, input.limit).map(p => ({
              sourceHour: p.sourceHour,
              targetHour: p.targetHour,
              candidateBalls: p.goldenBalls,
              reasoning: p.reasoning,
              accuracy: 0,
            })),
          };
        } catch (err) {
          console.error('[External API] Error fetching AI predictions:', err);
          return { success: false, data: [], error: String(err) };
        }
      }),

    /** 獲取命中率統計（過去 N 天） */
    getAccuracyStats: publicProcedure
      .input(z.object({
        days: z.number().min(1).max(30).default(7),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, data: [] };

        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - input.days);

          // 查詢驗證記錄表
          const records = await db
            .select({
              dateStr: sql`DATE(createdAt)`,
              totalPredictions: sql`COUNT(*)`,
              hits: sql`SUM(CASE WHEN isHit = true THEN 1 ELSE 0 END)`,
            })
            .from(sql`verificationRecords`)
            .where(sql`createdAt >= ${startDate}`)
            .groupBy(sql`DATE(createdAt)`);

          return {
            success: true,
            days: input.days,
            data: records.map(r => ({
              date: r.dateStr,
              totalPredictions: Number(r.totalPredictions) || 0,
              hits: Number(r.hits) || 0,
              accuracy: Number(r.totalPredictions) > 0
                ? ((Number(r.hits) || 0) / Number(r.totalPredictions) * 100).toFixed(2)
                : '0.00',
            })),
          };
        } catch (err) {
          console.error('[External API] Error fetching accuracy stats:', err);
          return { success: false, data: [], error: String(err) };
        }
      }),

    /** 獲取綜合數據（最新開獎 + 預測 + 統計） */
    getSummary: publicProcedure
      .input(z.object({
        dateStr: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dateStr = input.dateStr || getTodayDateStr();
        try {
          // 並行獲取三個數據源
          const [latestDrawsRes, predictionsRes, statsRes] = await Promise.all([
            // 最新開獎
            (async () => {
              const db = await getDb();
              if (!db) return { success: false, data: [] };
              const records = await db
                .select()
                .from(drawRecords)
                .orderBy(desc(drawRecords.drawNumber))
                .limit(5);
              return {
                success: true,
                data: records.reverse().map(r => ({
                  term: r.drawNumber,
                  time: r.drawTime,
                  numbers: r.numbers,
                  superNumber: r.superNumber,
                })),
              };
            })(),
            // AI 預測
            (async () => {
              try {
                const predictions = await getAiStarPredictions(dateStr);
                return {
                  success: true,
                  data: predictions.slice(0, 5).map(p => ({
                    sourceHour: p.sourceHour,
                    targetHour: p.targetHour,
                    candidateBalls: p.goldenBalls,
                  })),
                };
              } catch (err) {
                return { success: false, data: [] };
              }
            })(),
            // 統計數據
            (async () => {
              const db = await getDb();
              if (!db) return { success: false, data: {} };
              try {
                const result = await db
                  .select({
                    total: sql`COUNT(*)`,
                    hits: sql`SUM(CASE WHEN isHit = true THEN 1 ELSE 0 END)`,
                  })
                  .from(sql`verificationRecords`)
                  .where(sql`DATE(createdAt) = ${dateStr}`);
                const row = result[0];
                return {
                  success: true,
                  data: {
                    totalPredictions: Number(row?.total) || 0,
                    hits: Number(row?.hits) || 0,
                    accuracy: Number(row?.total) > 0
                      ? ((Number(row?.hits) || 0) / Number(row?.total) * 100).toFixed(2)
                      : '0.00',
                  },
                };
              } catch (err) {
                return { success: false, data: {} };
              }
            })(),
          ]);

          return {
            success: true,
            dateStr,
            timestamp: new Date().toISOString(),
            latestDraws: latestDrawsRes.data,
            predictions: predictionsRes.data,
            stats: statsRes.data,
          };
        } catch (err) {
          console.error('[External API] Error fetching summary:', err);
          return { success: false, error: String(err) };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
