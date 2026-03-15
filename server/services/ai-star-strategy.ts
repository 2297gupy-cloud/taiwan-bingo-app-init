/**
 * AI 一星策略服務
 * 分析各時段開獎數據，預測黃金球號碼
 * 支援 LLM 智能分析（使用 Manus 內建 Forge API）
 */
import { getDb } from "../db";
import { drawRecords, aiStarPredictions, type DrawRecord } from "../../drizzle/schema";
import { eq, and, desc, like, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Helper to get db instance
async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

/**
 * 每天的時段配置（08~22時，共15個）
 * - target: 卡片顯示的時段（要預測的時段）
 * - source: 複製數據的時段（前一個時段，用於 AI 演算）
 * 例：08時卡片 → 複製 07:00~07:55 的數據（source="07"）
 */
export const HOUR_SLOTS = [
  { source: "07", target: "08", label: "08時", copyRange: "0700~0755", draws: 12 },
  { source: "08", target: "09", label: "09時", copyRange: "0800~0855", draws: 12 },
  { source: "09", target: "10", label: "10時", copyRange: "0900~0955", draws: 12 },
  { source: "10", target: "11", label: "11時", copyRange: "1000~1055", draws: 12 },
  { source: "11", target: "12", label: "12時", copyRange: "1100~1155", draws: 12 },
  { source: "12", target: "13", label: "13時", copyRange: "1200~1255", draws: 12 },
  { source: "13", target: "14", label: "14時", copyRange: "1300~1355", draws: 12 },
  { source: "14", target: "15", label: "15時", copyRange: "1400~1455", draws: 12 },
  { source: "15", target: "16", label: "16時", copyRange: "1500~1555", draws: 12 },
  { source: "16", target: "17", label: "17時", copyRange: "1600~1655", draws: 12 },
  { source: "17", target: "18", label: "18時", copyRange: "1700~1755", draws: 12 },
  { source: "18", target: "19", label: "19時", copyRange: "1800~1855", draws: 12 },
  { source: "19", target: "20", label: "20時", copyRange: "1900~1955", draws: 12 },
  { source: "20", target: "21", label: "21時", copyRange: "2000~2055", draws: 12 },
  { source: "21", target: "22", label: "22時", copyRange: "2100~2155", draws: 12 },
];

/** 取得當前時段（台灣時間 UTC+8）
 * 返回的 hour 是目前小時，卡片顯示的是 target（預測時段）
 */
export function getCurrentSlot() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = utc8.getUTCHours();
  const minute = utc8.getUTCMinutes();

  const currentHour = String(hour).padStart(2, "0");
  // 尋找 target == currentHour 的時段（即現在正在進行的時段）
  const slot = HOUR_SLOTS.find((s) => s.target === currentHour);

  return {
    slot: slot || null,
    hour: currentHour,
    minute,
    isActive: hour >= 8 && hour <= 22,
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

/** 使用 LLM 智能分析開獎數據，推薦黃金球 */
async function analyzeWithLLM(
  draws: { term: string; time: string; numbers: number[] }[],
  sourceHour: string
): Promise<{ goldenBalls: number[]; reasoning: string }> {
  // 格式化開獎數據
  const drawLines = draws.map((d, idx) => {
    const nums = d.numbers.map((n) => String(n).padStart(2, "0")).join(" ");
    return `第${idx + 1}期 [${d.time}]: ${nums}`;
  });

  const dataText = drawLines.join("\n");

  const prompt = `你是台灣賓果彩票分析專家。以下是台灣賓果 ${sourceHour}:00-${sourceHour}:55 時段最近 ${draws.length} 期開獎數據（每期從1-80中開出20個號碼）：

${dataText}

請分析這些數據，找出規律，推薦 3 顆最有可能在下一個時段出現的「黃金球」號碼（1-80之間的整數）。

分析要點：
1. 統計各號碼出現頻率
2. 觀察近期趨勢（最近幾期的熱號）
3. 考慮冷號回補可能性
4. 注意號碼分布（大小、奇偶、區間分布）

請以 JSON 格式回應：
{
  "goldenBalls": [數字1, 數字2, 數字3],
  "reasoning": "簡短分析說明（50字以內）"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是台灣賓果彩票數據分析專家，專門分析開獎規律。請用繁體中文回應，並嚴格按照 JSON 格式輸出。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bingo_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              goldenBalls: {
                type: "array",
                items: { type: "integer" },
                description: "推薦的3顆黃金球號碼，每個號碼在1-80之間",
              },
              reasoning: {
                type: "string",
                description: "分析說明",
              },
            },
            required: ["goldenBalls", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("LLM 無回應");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content);
    const goldenBalls = (parsed.goldenBalls as number[])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 80)
      .slice(0, 3);

    if (goldenBalls.length < 1) throw new Error("LLM 未返回有效號碼");

    return {
      goldenBalls: goldenBalls.sort((a, b) => a - b),
      reasoning: parsed.reasoning || "AI 智能分析完成",
    };
  } catch (err) {
    console.error("[analyzeWithLLM] LLM 分析失敗，回退到統計方法:", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/** 統計方法分析（LLM 失敗時的備用方案） */
function analyzeWithStats(
  draws: { numbers: number[] }[],
  sourceHour: string
): { goldenBalls: number[]; reasoning: string } {
  // 統計各號碼出現頻率
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) {
    frequency[i] = 0;
  }

  for (const draw of draws) {
    for (const num of draw.numbers) {
      frequency[num] = (frequency[num] || 0) + 1;
    }
  }

  // 計算冷熱號碼
  const sortedByFreq = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);

  // 取最熱的 2 個和最冷的 1 個（共 3 顆）
  const hotNumbers = sortedByFreq.slice(0, 2).map((x) => x.num);
  const coldNumbers = sortedByFreq
    .slice(-15)
    .sort(() => Math.random() - 0.5)
    .slice(0, 1)
    .map((x) => x.num);

  const combined = [...hotNumbers, ...coldNumbers];
  const unique: number[] = [];
  for (const n of combined) {
    if (!unique.includes(n)) unique.push(n);
  }
  const goldenBalls = unique.slice(0, 3);
  goldenBalls.sort((a, b) => a - b);

  const topHot = hotNumbers.map((n) => String(n).padStart(2, "0")).join(", ");
  const reasoning = `統計分析 ${draws.length} 期 ${sourceHour}時段：熱號 ${topHot}，混合冷熱策略`;

  return { goldenBalls, reasoning };
}

/** 分析指定時段的開獎數據，返回黃金球推薦（優先使用 LLM，失敗則使用統計方法） */
export async function analyzeHourSlot(
  dateStr: string,
  sourceHour: string
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  sampleCount: number;
  usedLLM: boolean;
}> {
  const database = await db();

  // 取得近 30 天該時段的數據（最多 15 期）
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${sourceHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(15);

  if (allDraws.length === 0) {
    return {
      goldenBalls: [7, 14, 21, 28, 35, 42].slice(0, 3),
      reasoning: "數據不足，使用預設推薦號碼",
      sampleCount: 0,
      usedLLM: false,
    };
  }

  const drawsForAnalysis = allDraws.map((d: DrawRecord) => ({
    term: d.drawNumber,
    time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
    numbers: d.numbers as number[],
  }));

  // 嘗試 LLM 分析
  let usedLLM = false;
  let result: { goldenBalls: number[]; reasoning: string };

  try {
    result = await analyzeWithLLM(drawsForAnalysis, sourceHour);
    usedLLM = true;
    console.log(`[analyzeHourSlot] LLM 分析成功，時段 ${sourceHour}:`, result.goldenBalls);
  } catch (err) {
    console.log(`[analyzeHourSlot] LLM 失敗，使用統計方法，時段 ${sourceHour}`);
    result = analyzeWithStats(drawsForAnalysis, sourceHour);
  }

  return {
    ...result,
    sampleCount: allDraws.length,
    usedLLM,
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

/** 將 YYYY-MM-DD 轉換為民國年日期字串（用於查詢 drawTime）
 * 例: 2026-03-15 → 115/03/15
 */
function toROCDateStr(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const rocYear = year - 1911;
  return `${rocYear}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

/** 將 big/small/tie 轉換為顯示文字 */
function formatBigSmall(val: string): string {
  if (val === "big") return "大";
  if (val === "small") return "小";
  return "―";
}

/** 將 odd/even 轉換為顯示文字 */
function formatOddEven(val: string): string {
  if (val === "odd") return "單";
  if (val === "even") return "雙";
  return "―";
}

/** 固定演算說明文字 */
const FIXED_ANALYSIS_FOOTER = `
1. 演算之後 12 期出至最佳三顆黃金球數字，展開以下說明
2. 強勢熱門號，「尾數共振」偵測
3. 穩定的連莊號，捕捉剛起步的二連莊趨勢
4. 捕捉斜連交會點，鎖定高機率落球區
5. 縮小斜連跨度執行與精準死碼排除，強化防禦邏輯
6. 核心演算邏輯穩定，不用回測驗證
7. 核心演算結論 (5期策略) 預計期數/推薦組合重點/策略邏輯
`;

/** 取得格式化的時段數據（用於複製到 AI 計算）
 * dateStr: YYYY-MM-DD 格式
 * sourceHour: "07"~"21" （要複製的時段）
 * copyRange: 例 "0700~0755"
 */
export async function getFormattedHourData(
  dateStr: string,
  sourceHour: string,
  copyRange?: string
) {
  const database = await db();

  // 將 YYYY-MM-DD 轉為民國年日期字串（用於查詢 drawTime）
  const rocDate = toROCDateStr(dateStr);

  // 查詢指定日期 + 指定時段的開獎記錄
  // 只取舊格式期號（9位數字，例: 115014843），排除新格式期號（10位，例: 1150315030）
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${sourceHour}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawNumber))
    .limit(30); // 多取一些再過濾

  // 只保留 9 位期號的舊格式資料
  const draws = allDraws
    .filter((d) => d.drawNumber.length === 9)
    .slice(0, 12);

  if (draws.length === 0) {
    return { text: null };
  }

  // 小時範圍標顏（例: 0700~0755）
  const rangeLabel = copyRange || `${sourceHour}00~${sourceHour}55`;

  // 標顏列
  const separator = "-".repeat(89);
  const header = `BINGO BINGO 專業數據演算報告 (${rangeLabel})
報告日期：${rocDate.replace(/\//g, "/")}
${separator}`;

  // 每期資料行（從最新到最舊）
  const sortedDraws = [...draws].sort((a, b) =>
    b.drawNumber.localeCompare(a.drawNumber)
  );

  const lines = sortedDraws.map((draw: DrawRecord) => {
    // 號碼加空格分隔
    const numbers = (draw.numbers as number[])
      .sort((a, b) => a - b)
      .map((n) => String(n).padStart(2, "0"))
      .join(" ");
    // 取開獎時間中的 HH:MM
    const timePart = draw.drawTime.split(" ")[1]?.substring(0, 5) || "";
    const bigSmall = formatBigSmall(draw.bigSmall);
    const oddEven = formatOddEven(draw.oddEven);
    return `${draw.drawNumber}\n${timePart}\t${numbers}\t${draw.total}\t${bigSmall}\t${oddEven}`;
  });

  const text = `${header}\n${lines.join("\n")}\n${separator}${FIXED_ANALYSIS_FOOTER}`;
  return { text };
}

/** 批量分析所有時段（用於一鍵全部分析） */
export async function batchAnalyzeAllSlots(dateStr: string): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    sourceHour: string;
    success: boolean;
    goldenBalls?: number[];
    error?: string;
  }>;
}> {
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const slot of HOUR_SLOTS) {
    try {
      const result = await analyzeHourSlot(dateStr, slot.source);
      await saveAiStarPrediction(
        dateStr,
        slot.source,
        slot.target,
        result.goldenBalls,
        false,
        result.reasoning
      );
      results.push({
        sourceHour: slot.source,
        success: true,
        goldenBalls: result.goldenBalls,
      });
      successCount++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知錯誤";
      results.push({
        sourceHour: slot.source,
        success: false,
        error: errorMsg,
      });
      failedCount++;
    }
  }

  return {
    total: HOUR_SLOTS.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/** 取得近 7 天的分析記錄 */
export async function getAnalysisRecords(days: number = 7): Promise<Array<{
  dateStr: string;
  totalSlots: number;
  analyzedSlots: number;
  hitRate: number;
}>> {
  const database = await db();
  const records = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    utc8.setUTCDate(utc8.getUTCDate() - i);
    const dateStr = utc8.toISOString().split("T")[0];

    const predictions = await database
      .select()
      .from(aiStarPredictions)
      .where(eq(aiStarPredictions.dateStr, dateStr));

    records.push({
      dateStr,
      totalSlots: HOUR_SLOTS.length,
      analyzedSlots: predictions.length,
      hitRate: 0, // 可以後續計算實際命中率
    });
  }

  return records;
}
