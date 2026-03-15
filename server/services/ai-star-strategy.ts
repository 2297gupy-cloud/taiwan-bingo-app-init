/**
 * AI 一星策略服務
 * 分析各時段開獎數據，預測黃金球號碼
 */
import { getDb } from "../db";
import { drawRecords, aiStarPredictions, type DrawRecord } from "../../drizzle/schema";
import { eq, and, desc, like } from "drizzle-orm";

// Helper to get db instance
async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

/** 每天的時段配置：07-22時，每時段分析前一時段 */
export const HOUR_SLOTS = [
  { source: "07", target: "08", label: "07時→08時", draws: 12 },
  { source: "08", target: "09", label: "08時→09時", draws: 12 },
  { source: "09", target: "10", label: "09時→10時", draws: 12 },
  { source: "10", target: "11", label: "10時→11時", draws: 12 },
  { source: "11", target: "12", label: "11時→12時", draws: 12 },
  { source: "12", target: "13", label: "12時→13時", draws: 12 },
  { source: "13", target: "14", label: "13時→14時", draws: 12 },
  { source: "14", target: "15", label: "14時→15時", draws: 12 },
  { source: "15", target: "16", label: "15時→16時", draws: 12 },
  { source: "16", target: "17", label: "16時→17時", draws: 12 },
  { source: "17", target: "18", label: "17時→18時", draws: 12 },
  { source: "18", target: "19", label: "18時→19時", draws: 12 },
  { source: "19", target: "20", label: "19時→20時", draws: 12 },
  { source: "20", target: "21", label: "20時→21時", draws: 12 },
  { source: "21", target: "22", label: "21時→22時", draws: 12 },
  { source: "22", target: "23", label: "22時→23時", draws: 12 },
];

/** 取得當前時段（台灣時間 UTC+8） */
export function getCurrentSlot() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = utc8.getUTCHours();
  const minute = utc8.getUTCMinutes();

  // 找出當前時段
  const currentHour = String(hour).padStart(2, "0");
  const slot = HOUR_SLOTS.find((s) => s.source === currentHour);

  return {
    slot: slot || null,
    hour: currentHour,
    minute,
    isActive: hour >= 7 && hour <= 22,
  };
}

/** 取得今日日期字符串（台灣時間，07:00 前算昨天） */
export function getTodayDateStr(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = utc8.getUTCHours();
  if (hour < 7) {
    utc8.setUTCDate(utc8.getUTCDate() - 1);
  }
  return utc8.toISOString().split("T")[0];
}

/** 分析指定時段的開獎數據，返回黃金球推薦 */
export async function analyzeHourSlot(
  dateStr: string,
  sourceHour: string
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  sampleCount: number;
}> {
  // 取得該時段的開獎記錄（近 15 期）
  const database = await db();
  // 取得近 30 天該時段的數據
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${sourceHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(15);

  if (allDraws.length === 0) {
    // 沒有數據時，返回統計最常出現的號碼
    return {
      goldenBalls: [7, 14, 21, 28, 35, 42],
      reasoning: "數據不足，使用預設推薦號碼",
      sampleCount: 0,
    };
  }

  // 統計各號碼出現頻率
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) {
    frequency[i] = 0;
  }

  for (const draw of allDraws) {
    const numbers = draw.numbers as number[];
    for (const num of numbers) {
      frequency[num] = (frequency[num] || 0) + 1;
    }
  }

  // 計算冷熱號碼
  const sortedByFreq = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);

  // 取最熱的 3 個和最冷的 3 個
  const hotNumbers = sortedByFreq.slice(0, 3).map((x) => x.num);
  const coldNumbers = sortedByFreq
    .slice(-10)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((x) => x.num);

  // 混合熱號和冷號（避免 Set spread 的 TypeScript 問題）
  const combined = [...hotNumbers, ...coldNumbers];
  const unique: number[] = [];
  for (const n of combined) {
    if (!unique.includes(n)) unique.push(n);
  }
  const goldenBalls = unique.slice(0, 6);
  goldenBalls.sort((a, b) => a - b);

  const topHot = hotNumbers.map((n) => String(n).padStart(2, "0")).join(", ");
  const reasoning = `根據近 ${allDraws.length} 期 ${sourceHour}時段數據分析：熱號 ${topHot}，混合冷熱策略推薦 ${goldenBalls.length} 顆黃金球`;

  return {
    goldenBalls,
    reasoning,
    sampleCount: allDraws.length,
  };
}

/** 取得指定時段的開獎記錄（用於數字分布顯示） */
export async function getHourDraws(dateStr: string, targetHour: string) {
  const database = await db();
  const draws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${targetHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(15);

  return draws.map((d: DrawRecord) => ({
    term: d.drawNumber,
    time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
    numbers: d.numbers as number[],
    pending: false,
  }));
}

/** 取得指定日期的所有 AI 一星預測 */
export async function getAiStarPredictions(dateStr: string) {
  const database = await db();
  const predictions = await database
    .select()
    .from(aiStarPredictions)
    .where(eq(aiStarPredictions.dateStr, dateStr))
    .orderBy(aiStarPredictions.sourceHour);

  return predictions.map((p) => ({
    id: p.id,
    dateStr: p.dateStr,
    sourceHour: p.sourceHour,
    targetHour: p.targetHour,
    goldenBalls: p.goldenBalls as number[],
    isManual: p.isManual === 1,
    reasoning: p.reasoning,
    verification: [] as { term: string; time: string; isHit: boolean; hits: number[]; index: number; pending?: boolean }[],
  }));
}

/** 儲存或更新 AI 一星預測 */
export async function saveAiStarPrediction(
  dateStr: string,
  sourceHour: string,
  targetHour: string,
  goldenBalls: number[],
  isManual: boolean,
  reasoning?: string
) {
  const database = await db();
  // 檢查是否已存在
  const existing = await database
    .select()
    .from(aiStarPredictions)
    .where(
      and(
        eq(aiStarPredictions.dateStr, dateStr),
        eq(aiStarPredictions.sourceHour, sourceHour)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新
    await database
      .update(aiStarPredictions)
      .set({
        goldenBalls,
        isManual: isManual ? 1 : 0,
        reasoning: reasoning || null,
      })
      .where(eq(aiStarPredictions.id, existing[0].id));
  } else {
    // 插入
    await database.insert(aiStarPredictions).values({
      dateStr,
      sourceHour,
      targetHour,
      goldenBalls,
      isManual: isManual ? 1 : 0,
      reasoning: reasoning || null,
    });
  }
}

/** 刪除指定時段的 AI 一星預測 */
export async function deleteAiStarPrediction(dateStr: string, sourceHour: string) {
  const database = await db();
  await database
    .delete(aiStarPredictions)
    .where(
      and(
        eq(aiStarPredictions.dateStr, dateStr),
        eq(aiStarPredictions.sourceHour, sourceHour)
      )
    );
}

/** 驗證預測結果：比對黃金球是否命中目標時段的開獎 */
export async function verifyPrediction(
  dateStr: string,
  targetHour: string,
  goldenBalls: number[]
) {
  const database = await db();
  // 取得目標時段的開獎記錄（近 12 期）
  const draws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${targetHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(12);

  const goldenSet = new Set<number>(goldenBalls);
  const goldenSetArr = goldenBalls;

  return draws.map((draw: DrawRecord, idx: number) => {
    const numbers = draw.numbers as number[];
    const hits = numbers.filter((n) => goldenSetArr.includes(n));
    return {
      term: draw.drawNumber,
      time: draw.drawTime.split(" ")[1]?.substring(0, 5) || "",
      isHit: hits.length > 0,
      hits,
      index: idx + 1,
      pending: false,
    };
  });
}

/** 取得格式化的時段數據（用於複製到 AI 計算） */
export async function getFormattedHourData(dateStr: string, sourceHour: string) {
  const database = await db();
  const draws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${sourceHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(12);

  if (draws.length === 0) {
    return { text: null };
  }

  const lines = draws.map((draw: DrawRecord, idx: number) => {
    const numbers = (draw.numbers as number[])
      .map((n) => String(n).padStart(2, "0"))
      .join(" ");
    return `期 ${idx + 1}: ${numbers}`;
  });

  const text = `${sourceHour}時段近 ${draws.length} 期開獎數據：\n${lines.join("\n")}`;
  return { text };
}
