import { getDb } from "../db";
import { drawRecords, aiStarVerificationRecords, aiStarHitRateSummary } from "../../drizzle/schema";
import { analyzeHourSlot } from "./ai-star-strategy";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * 批量分析指定日期的所有時段
 * @param userId 用戶 ID
 * @param analysisDate 分析日期，格式 YYYY-MM-DD
 * @returns 分析結果
 */
export async function batchAnalyzeDay(userId: number, analysisDate: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results: Array<{
    slotHour: string;
    goldenBalls: number[];
    llmError?: string;
  }> = [];

  // 時段列表 (07-23)
  const hours = Array.from({ length: 17 }, (_, i) => {
    const hour = 7 + i;
    return hour.toString().padStart(2, "0");
  });

  // 遍歷每個時段進行分析
  for (const hour of hours) {
    try {
      const analysis = await analyzeHourSlot(analysisDate, hour);
      results.push({
        slotHour: hour,
        goldenBalls: analysis.goldenBalls,
        llmError: analysis.llmError,
      });

      // 每 12 期完成後寫入數據庫
      if (results.length % 12 === 0) {
        await saveVerificationRecords(userId, analysisDate, results.slice(-12));
      }
    } catch (error) {
      console.error(`Error analyzing hour ${hour}:`, error);
      results.push({
        slotHour: hour,
        goldenBalls: [],
        llmError: "分析失敗",
      });
    }
  }

  // 保存剩餘的結果
  if (results.length % 12 !== 0) {
    await saveVerificationRecords(userId, analysisDate, results.slice(-(results.length % 12)));
  }

  // 計算並保存命中率
  await calculateAndSaveHitRate(userId, analysisDate);

  return results;
}

/**
 * 保存驗證紀錄到數據庫
 */
async function saveVerificationRecords(
  userId: number,
  analysisDate: string,
  results: Array<{
    slotHour: string;
    goldenBalls: number[];
    llmError?: string;
  }>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  for (const result of results) {
    // 查詢該時段的實際開獎結果
    const actualDraws = await db
      .select()
      .from(drawRecords)
      .where(
        and(
          gte(drawRecords.drawTime, `${analysisDate.replace(/-/g, "/")} ${result.slotHour}:00:00`),
          lte(drawRecords.drawTime, `${analysisDate.replace(/-/g, "/")} ${result.slotHour}:59:59`)
        )
      );

    const actualResult = actualDraws.length > 0 ? actualDraws[0].numbers : null;

    // 計算命中數
    let hitCount = 0;
    let hitStatus = 0; // 0=未開獎, 1=命中, 2=未命中

    if (actualResult) {
      hitCount = result.goldenBalls.filter((ball) => actualResult.includes(ball)).length;
      hitStatus = hitCount > 0 ? 1 : 2;
    }

    // 插入驗證紀錄
    await db.insert(aiStarVerificationRecords).values({
      userId,
      analysisDate,
      slotHour: result.slotHour,
      recommendedBalls: result.goldenBalls,
      actualResult: actualResult || null,
      hitCount,
      hitStatus,
    });
  }
}

/**
 * 計算並保存命中率
 */
async function calculateAndSaveHitRate(userId: number, analysisDate: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 查詢該日期的所有驗證紀錄
  const records = await db
    .select()
    .from(aiStarVerificationRecords)
    .where(and(eq(aiStarVerificationRecords.userId, userId), eq(aiStarVerificationRecords.analysisDate, analysisDate)));

  const totalPredictions = records.length;
  const totalHits = records.filter((r: any) => r.hitStatus === 1).length;
  const hitRate = totalPredictions > 0 ? Math.round((totalHits / totalPredictions) * 100) : 0;

  // 插入命中率統計
  await db.insert(aiStarHitRateSummary).values({
    userId,
    analysisDate,
    totalPredictions,
    totalHits,
    hitRate,
  });
}

/**
 * 查詢 7 天內的驗證紀錄和命中率
 */
export async function getVerificationHistory(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  // 查詢命中率統計
  const hitRateSummaries = await db
    .select()
    .from(aiStarHitRateSummary)
    .where(
      and(
        eq(aiStarHitRateSummary.userId, userId),
        gte(aiStarHitRateSummary.analysisDate, startDateStr)
      )
    );

  // 查詢驗證紀錄
  const verificationRecords = await db
    .select()
    .from(aiStarVerificationRecords)
    .where(
      and(
        eq(aiStarVerificationRecords.userId, userId),
        gte(aiStarVerificationRecords.analysisDate, startDateStr)
      )
    );

  return {
    hitRateSummaries,
    verificationRecords,
  };
}
