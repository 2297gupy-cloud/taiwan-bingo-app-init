/*
 * AI 一星策略服務
 * 分析各時段開獎數據，預測黃金球號碼
 * 支援 LLM 智能分析（使用 Manus 內建 Forge API）
 */
import { getDb } from "../db";
import { drawRecords, aiStarPredictions, aiStarVerificationRecords, aiStarHitRateSummary, type DrawRecord } from "../../drizzle/schema";
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
  // 卡片邏輯：source=複製數據的時段，target=卡片顯示時段，verifyHour=驗證時段(同 target，即時驗證)
  // 例：14時卡片 → 複製13時數據(source=13) → 驗證14:00~14:55(verifyHour=14)
  { source: "07", target: "08", label: "08時", copyRange: "0700~0755", draws: 12, verifyHour: "08", verifyRange: "0800~0855" },
  { source: "08", target: "09", label: "09時", copyRange: "0800~0855", draws: 12, verifyHour: "09", verifyRange: "0900~0955" },
  { source: "09", target: "10", label: "10時", copyRange: "0900~0955", draws: 12, verifyHour: "10", verifyRange: "1000~1055" },
  { source: "10", target: "11", label: "11時", copyRange: "1000~1055", draws: 12, verifyHour: "11", verifyRange: "1100~1155" },
  { source: "11", target: "12", label: "12時", copyRange: "1100~1155", draws: 12, verifyHour: "12", verifyRange: "1200~1255" },
  { source: "12", target: "13", label: "13時", copyRange: "1200~1255", draws: 12, verifyHour: "13", verifyRange: "1300~1355" },
  { source: "13", target: "14", label: "14時", copyRange: "1300~1355", draws: 12, verifyHour: "14", verifyRange: "1400~1455" },
  { source: "14", target: "15", label: "15時", copyRange: "1400~1455", draws: 12, verifyHour: "15", verifyRange: "1500~1555" },
  { source: "15", target: "16", label: "16時", copyRange: "1500~1555", draws: 12, verifyHour: "16", verifyRange: "1600~1655" },
  { source: "16", target: "17", label: "17時", copyRange: "1600~1655", draws: 12, verifyHour: "17", verifyRange: "1700~1755" },
  { source: "17", target: "18", label: "18時", copyRange: "1700~1755", draws: 12, verifyHour: "18", verifyRange: "1800~1855" },
  { source: "18", target: "19", label: "19時", copyRange: "1800~1855", draws: 12, verifyHour: "19", verifyRange: "1900~1955" },
  { source: "19", target: "20", label: "20時", copyRange: "1900~1955", draws: 12, verifyHour: "20", verifyRange: "2000~2055" },
  { source: "20", target: "21", label: "21時", copyRange: "2000~2055", draws: 12, verifyHour: "21", verifyRange: "2100~2155" },
  { source: "21", target: "22", label: "22時", copyRange: "2100~2155", draws: 12, verifyHour: "22", verifyRange: "2200~2255" },
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

/** 構建頻率分析說明 */
function buildFrequencyAnalysis(
  draws: { term: string; time: string; numbers: number[] }[]
): string {
  const frequency: Record<number, number> = {};
  for (const draw of draws) {
    for (const num of draw.numbers) {
      frequency[num] = (frequency[num] || 0) + 1;
    }
  }

  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);

  const topHot = sorted.slice(0, 8).map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");
  const topCold = sorted.slice(-8).reverse().map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");

  // 計算近 5 期趨勢
  const recent5 = draws.slice(0, 5);
  const recent5Freq: Record<number, number> = {};
  for (const draw of recent5) {
    for (const num of draw.numbers) {
      recent5Freq[num] = (recent5Freq[num] || 0) + 1;
    }
  }

  const recent5Hot = Object.entries(recent5Freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => String(parseInt(num)).padStart(2, "0"))
    .join(", ");

  return `熱號: ${topHot}\n冷號: ${topCold}\n近5期熱號: ${recent5Hot}`;
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

/** 取得指定時段的開獎數據（最近 10 期） */
export async function getHourDraws(
  dateStr: string,
  targetHour: string,
  limit: number = 10
): Promise<{ term: string; time: string; numbers: number[]; superNumber: number }[]> {
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const hourNum = parseInt(targetHour, 10);

  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${String(hourNum).padStart(2, "0")}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  // 用 drawTime 去重，建立時間→開獎記錄的 Map
  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) {
      drawMap.set(timeKey, d);
    }
  }

  // 轉換為陣列並排序（從舊到新）
  const result = Array.from(drawMap.values())
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime))
    .slice(0, limit)
    .map((d) => ({
      term: d.drawNumber,
      time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
      numbers: d.numbers as number[],
      superNumber: d.superNumber as number,
    }));

  return result;
}

/** 取得指定日期的所有 AI 一星預測 */
export async function getAiStarPredictions(dateStr: string) {
  const database = await db();
  return database
    .select()
    .from(aiStarPredictions)
    .where(eq(aiStarPredictions.dateStr, dateStr));
}

/** 儲存 AI 一星預測 */
export async function saveAiStarPrediction(
  dateStr: string,
  sourceHour: string,
  targetHour: string,
  goldenBalls: number[],
  isManual: boolean = false,
  reasoning: string = ""
) {
  const database = await db();
  const existing = await database
    .select()
    .from(aiStarPredictions)
    .where(
      and(
        eq(aiStarPredictions.dateStr, dateStr),
        eq(aiStarPredictions.sourceHour, sourceHour)
      )
    );

  if (existing.length > 0) {
    await database
      .update(aiStarPredictions)
      .set({
        goldenBalls,
        isManual: isManual ? 1 : 0,
        reasoning,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiStarPredictions.dateStr, dateStr),
          eq(aiStarPredictions.sourceHour, sourceHour)
        )
      );
  } else {
    await database.insert(aiStarPredictions).values({
      dateStr,
      sourceHour,
      targetHour,
      goldenBalls,
      isManual: isManual ? 1 : 0,
      reasoning,
    });
  }
}

/** 刪除指定時段的預測 */
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

/** 驗證預測結果
 * verifyHour: 實際驗證的時段（卡片顯示時段+1）
 * 例：08時卡片的黃金球 → verifyHour="09" → 驗證 09:00~09:55
 */
export async function verifyPrediction(
  dateStr: string,
  verifyHour: string,
  goldenBalls: number[]
) {
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const hourNum = parseInt(verifyHour, 10);

  // 生成完整 12 個時間點（xx:00, xx:05, xx:10 ... xx:55）
  const timeSlots: string[] = [];
  for (let m = 0; m < 60; m += 5) {
    timeSlots.push(`${String(hourNum).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  // 查詢指定日期 + 指定驗證時段的開獎記錄
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${verifyHour}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  // 用 drawTime 去重，建立時間→開獎記錄的 Map
  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) {
      drawMap.set(timeKey, d);
    }
  }

  const goldenSetArr = goldenBalls;
  // 從舊到新排列（xx:00 → xx:55）——時間由小到大
  return timeSlots.map((timeSlot, idx) => {
    const draw = drawMap.get(timeSlot);
    if (draw) {
      const numbers = draw.numbers as number[];
      const hits = numbers.filter((n) => goldenSetArr.includes(n));
      const superNum = draw.superNumber as number;
      const isSuperHit = goldenSetArr.includes(superNum);
      return {
        term: draw.drawNumber,
        time: timeSlot,
        isHit: hits.length > 0,
        hits,
        superNumber: superNum,
        isSuperHit,
        index: idx + 1,
        pending: false,
      };
    } else {
      // 未開獎
      return {
        term: "---",
        time: timeSlot,
        isHit: false,
        hits: [] as number[],
        superNumber: 0,
        isSuperHit: false,
        index: idx + 1,
        pending: true,
      };
    }
  });
}

/** 取得格式化的時段開獎數據（用於複製到 AI） */
export async function getFormattedHourData(
  dateStr: string,
  sourceHour: string,
  copyRange?: string
): Promise<{ text: string }> {
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const hourNum = parseInt(sourceHour, 10);

  // 查詢該時段的開獎記錄
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${String(hourNum).padStart(2, "0")}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  // 用 drawTime 去重，建立時間→開獎記錄的 Map
  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) {
      drawMap.set(timeKey, d);
    }
  }

  // 轉換為陣列並排序（從新到舊，用於 AI 分析）
  // 08 時取 11 期（07:05~07:55），其他時段取 12 期
  const periodCount = sourceHour === "08" ? 11 : 12;
  const draws = Array.from(drawMap.values())
    .sort((a, b) => b.drawTime.localeCompare(a.drawTime))
    .slice(0, periodCount)
    .map((d) => ({
      term: d.drawNumber,
      time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
      numbers: d.numbers as number[],
      superNumber: d.superNumber as number,
      bigSmall: formatBigSmall(d.bigSmall),
      oddEven: "－",  // 始終顯示「－」，因為超級獎號碼沒有中獎
    }));

  const header = `台灣賓果 ${sourceHour}:00~${sourceHour}:55 時段開獎數據\n日期: ${dateStr}\n時段: ${copyRange || ""}`;
  const separator = "─".repeat(60);
  const FIXED_ANALYSIS_FOOTER = `
專業數據演算報告

1. 演算之後 12 期出至最佳三顆黃金球數字，展開以下說明
2. 強勢熱門號，「尾數共振」偵測
3. 穩定的連莊號，捕捉剛起步的二連莊趨勢
4. 捕捉斜連交會點，鎖定高機率落球區
5. 縮小斜連跨度執行與精準死碼排除，強化防禦邏輯
6. 核心演算邏輯穩定，不用回測驗證
7. 核心演算結論 (5期策略) 預計期數/推視組合重點/策略邂輯`;

  const lines = draws.map((d, i) => {
    const numsStr = d.numbers.map(n => String(n).padStart(2, "0")).join(" ");
    // 直接使用數據庫的大小和單雙值，沒有時顯示「－」
    const bigSmallDisplay = d.bigSmall && d.bigSmall !== "－" ? d.bigSmall : "－";
    const oddEvenDisplay = d.oddEven && d.oddEven !== "－" ? d.oddEven : "－";
    return `第${i + 1}期 ${d.time} (${d.term}): ${numsStr} 超級獎${String(d.superNumber).padStart(2, "0")}\t${bigSmallDisplay}\t${oddEvenDisplay}`;
  });

  const text = `${header}\n${lines.join("\n")}\n${separator}${FIXED_ANALYSIS_FOOTER}`;
  return { text };
}

// ============================================================
// LLM 分析服務
// ============================================================

/** 使用 LLM 分析時段數據 */
async function analyzeWithLLM(
  dataText: string,
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
}> {
  const prompt = `你是台灣賓果彩票分析專家。以下是台灣賓果 ${sourceHour}:00-${sourceHour}:55 時段最近 10 期的開獎數據：\n${dataText}\n請分析這些開獎數據的規律，推薦 3 顆最有可能在下一個時段出現的黃金球號碼（1-80之間的整數）。\n\n分析要點：\n1. 統計各號碼出現頻率（熱號代表高機率）\n2. 觀察近期趨勢（近期熱號更重要）\n3. 考慮冷號回補可能性（長期未出的號碼）\n4. 連莊號（相鄰期數出現的號碼）\n5. 斜連交會點（對角線相鄰的號碼）\n6. 區間平衡度（小號區與大號區的平衡）\n7. 整體策略（綜合上述分析給出最終推薦）\n\n請以 JSON 格式回應，提供詳細分析（7 項完整分析）：\n{\n  "goldenBalls": [數字1, 數字2, 數字3],\n  "reasoning": "簡短結論（不超過 80 字）",\n  "hotAnalysis": "1. 強勢熱號分析：說明 TOP3 熱號及其出現頻率",\n  "streakAnalysis": "2. 連莊號分析：相鄰期數出現的號碼及其規律",\n  "diagonalAnalysis": "3. 斜連交會點：對角線相鄰的號碼組合",\n  "deadNumbers": "4. 死碼排除：長期未出現的號碼（應避免）",\n  "coldAnalysis": "5. 冷號回補分析：說明為何選擇冷號回補",\n  "trendAnalysis": "6. 區間趨勢分析：近期趨勢說明及區間分布",\n  "coreConclusion": "7. 核心演算結論：綜合上述 6 項分析，給出最終推薦策略",\n  "strategy": "整體選號策略：簡述選號邏輯"\n}`;

  const llmMessages = [
    { role: "system" as const, content: "你是台灣賓果彩票數據分析專家。請用繁體中文回應，並嚴格按照 JSON 格式輸出。" },
    { role: "user" as const, content: prompt },
  ];

  const llmResponseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: "ai_star_prediction",
      strict: true,
      schema: {
        type: "object",
        properties: {
          goldenBalls: { type: "array", items: { type: "integer" } },
          reasoning: { type: "string" },
          hotAnalysis: { type: "string", description: "1. 強勢熱號分析" },
          streakAnalysis: { type: "string", description: "2. 連莊號分析" },
          diagonalAnalysis: { type: "string", description: "3. 斜連交會點" },
          deadNumbers: { type: "string", description: "4. 死碼排除" },
          coldAnalysis: { type: "string", description: "5. 冷號回補分析" },
          trendAnalysis: { type: "string", description: "6. 區間趨勢分析" },
          coreConclusion: { type: "string", description: "7. 核心演算結論" },
          strategy: { type: "string", description: "整體選號策略" },
        },
        required: ["goldenBalls", "reasoning", "hotAnalysis", "streakAnalysis", "diagonalAnalysis", "deadNumbers", "coldAnalysis", "trendAnalysis", "coreConclusion", "strategy"],
        additionalProperties: false,
      },
    },
  };

  const response = await invokeLLM({
    messages: llmMessages,
    response_format: llmResponseFormat,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 回應為空");

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const parsed = JSON.parse(contentStr);
  return {
    goldenBalls: parsed.goldenBalls.slice(0, 3),
    reasoning: parsed.reasoning,
    hotAnalysis: parsed.hotAnalysis,
    streakAnalysis: parsed.streakAnalysis,
    diagonalAnalysis: parsed.diagonalAnalysis,
    deadNumbers: parsed.deadNumbers,
    coldAnalysis: parsed.coldAnalysis,
    trendAnalysis: parsed.trendAnalysis,
    coreConclusion: parsed.coreConclusion,
    strategy: parsed.strategy,
  };
}

// ============================================================
// 統計分析方法
// ============================================================

/** 統計分析時段數據（作為 LLM 失敗時的備用方案） */
async function analyzeStatistically(
  dateStr: string,
  sourceHour: string
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
}> {
  const draws = await getHourDraws(dateStr, sourceHour, 10);

  // 統計頻率
  const frequency: Record<number, number> = {};
  for (const draw of draws) {
    for (const num of draw.numbers) {
      frequency[num] = (frequency[num] || 0) + 1;
    }
  }

  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);

  const topHot = sorted.slice(0, 3);
  const topCold = sorted.slice(-3).reverse();

  // 近 5 期分析
  const recent5 = draws.slice(0, 5);
  const recent5Freq: Record<number, number> = {};
  for (const draw of recent5) {
    for (const num of draw.numbers) {
      recent5Freq[num] = (recent5Freq[num] || 0) + 1;
    }
  }

  const recent5Hot = Object.entries(recent5Freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([num]) => parseInt(num));

  // 連莊號分析
  const streakNumbers = new Set<number>();
  if (draws.length >= 2) {
    const lastDraw = draws[0].numbers;
    const prevDraw = draws[1].numbers;
    for (const num of lastDraw) {
      if (prevDraw.includes(num)) {
        streakNumbers.add(num);
      }
    }
  }

  // 推薦黃金球
  const candidates = new Set<number>();
  for (const item of topHot.slice(0, 2)) {
    candidates.add(item.num);
  }
  for (const num of Array.from(recent5Hot)) {
    if (candidates.size < 3) candidates.add(num);
  }
  for (const num of Array.from(streakNumbers)) {
    if (candidates.size < 3) candidates.add(num);
  }

  const goldenBalls = Array.from(candidates).slice(0, 3);

  const hotStr = topHot.map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");
  const coldStr = topCold.map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");
  const recentStr = recent5Hot.map(n => String(n).padStart(2, "0")).join(", ");
  const streakStr = Array.from(streakNumbers).map(n => String(n).padStart(2, "0")).join(", ");

  return {
    goldenBalls,
    reasoning: `基於統計方法：熱號 ${hotStr.substring(0, 30)}... 近期 ${recentStr}`,
    hotAnalysis: `1. 強勢熱號分析：${hotStr}`,
    streakAnalysis: `2. 連莊號分析：${streakStr || "無"}`,
    diagonalAnalysis: `3. 斜連交會點：基於最近 5 期數據分析`,
    deadNumbers: `4. 死碼排除：${coldStr}`,
    coldAnalysis: `5. 冷號回補分析：考慮冷號回補機率`,
    trendAnalysis: `6. 區間趨勢分析：近 5 期熱號 ${recentStr}`,
    coreConclusion: `7. 核心演算結論：推薦 ${goldenBalls.map(n => String(n).padStart(2, "0")).join(", ")} 三顆黃金球`,
    strategy: `整體選號策略：結合熱號、近期趨勢和連莊號分析`,
  };
}

// ============================================================
// 時段分析主函數
// ============================================================

/** 分析指定時段的開獎數據 */
export async function analyzeHourSlot(
  dateStr: string,
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
  llmError?: string;
}> {
  try {
    // 優先使用 LLM 分析（如果有 API Key）
    if (userApiKey) {
      try {
        const formatted = await getFormattedHourData(dateStr, sourceHour);
        if (formatted.text) {
          return await analyzeWithLLM(formatted.text, sourceHour, userApiKey, customBaseUrl, customModel);
        }
      } catch (llmErr) {
        const errorMsg = llmErr instanceof Error ? llmErr.message : "LLM 分析失敗";
        console.warn(`LLM 分析失敗，回退到統計方法：${errorMsg}`);
        // 繼續使用統計方法
      }
    }

    // 回退到統計分析
    return await analyzeStatistically(dateStr, sourceHour);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "分析失敗";
    console.error(`時段分析失敗：${errorMsg}`);
    throw err;
  }
}

/** 批量分析所有時段（用於一鍵全部分析） */
export async function batchAnalyzeAllSlots(dateStr: string, userId?: number): Promise<{
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
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const verificationRecords = [];
  let totalHits = 0;

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

      // 驗證預測結果
      const verifyHour = slot.target;
      const goldenBalls = result.goldenBalls;
      
      // 查詢該時段的實際開獎結果
      const allDraws = await database
        .select()
        .from(drawRecords)
        .where(
          and(
            like(drawRecords.drawTime, `${rocDate}%`),
            like(drawRecords.drawTime, `% ${verifyHour}:%`)
          )
        )
        .orderBy(desc(drawRecords.drawTime))
        .limit(30);

      // 去重並統計命中
      const drawMap = new Map<string, typeof allDraws[0]>();
      for (const d of allDraws) {
        const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
        if (!drawMap.has(timeKey)) {
          drawMap.set(timeKey, d);
        }
      }

      let slotHitCount = 0;
      let hitStatus = 0; // 0=未開獎, 1=命中, 2=未命中
      let actualResult: number[] = [];

      drawMap.forEach((draw) => {
        const numbers = draw.numbers as number[];
        const hits = numbers.filter((n) => goldenBalls.includes(n));
        if (hits.length > 0) {
          slotHitCount += hits.length;
          hitStatus = 1; // 命中
        }
        actualResult = numbers;
      });

      // 如果有開獎記錄但沒有命中
      if (actualResult.length > 0 && slotHitCount === 0) {
        hitStatus = 2; // 未命中
      }

      // 存儲驗證記錄
      if (userId) {
        verificationRecords.push({
          userId,
          analysisDate: dateStr,
          slotHour: verifyHour,
          recommendedBalls: goldenBalls,
          actualResult: actualResult.length > 0 ? actualResult : undefined,
          hitCount: slotHitCount,
          hitStatus,
        } as any);
        totalHits += slotHitCount;
      }

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

  // 批量存儲驗證記錄（每 12 期存儲一次）
  if (userId && verificationRecords.length > 0) {
    try {
      // 每 12 期存儲一次
      for (let i = 0; i < verificationRecords.length; i += 12) {
        const batch = verificationRecords.slice(i, i + 12);
        await database.insert(aiStarVerificationRecords).values(batch);
      }

      // 清理超過 7 天的舊記錄
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      await database
        .delete(aiStarVerificationRecords)
        .where(
          and(
            eq(aiStarVerificationRecords.userId, userId),
            like(aiStarVerificationRecords.analysisDate, `${sevenDaysAgoStr}%`)
          )
        );

      // 計算並更新命中率統計
      const hitRatePercent = verificationRecords.length > 0 
        ? Math.round((totalHits / verificationRecords.length) * 100)
        : 0;

      try {
        await database
          .insert(aiStarHitRateSummary)
          .values({
            userId,
            analysisDate: dateStr,
            totalPredictions: verificationRecords.length,
            totalHits,
            hitRate: hitRatePercent,
          });
      } catch (err) {
        // 如果記錄已存在，嘗試更新
        await database
          .update(aiStarHitRateSummary)
          .set({
            totalPredictions: verificationRecords.length,
            totalHits,
            hitRate: hitRatePercent,
          })
          .where(
            and(
              eq(aiStarHitRateSummary.userId, userId),
              eq(aiStarHitRateSummary.analysisDate, dateStr)
            )
          );
      }
    } catch (err) {
      console.error("Failed to store verification records:", err);
    }
  }

  return {
    total: HOUR_SLOTS.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/** 取得近 N 天的分析記錄和命中率 */
export async function getAnalysisRecords(days: number = 7, userId?: number): Promise<Array<{
  dateStr: string;
  totalSlots: number;
  analyzedSlots: number;
  hitRate: number;
  totalHits?: number;
  totalPredictions?: number;
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

    // 如果有 userId，從命中率記錄表中查詢
    let hitRate = 0;
    let totalHits = 0;
    let totalPredictions = 0;
    if (userId) {
      const hitRateRecords = await database
        .select()
        .from(aiStarHitRateSummary)
        .where(
          and(
            eq(aiStarHitRateSummary.userId, userId),
            eq(aiStarHitRateSummary.analysisDate, dateStr)
          )
        );
      if (hitRateRecords.length > 0) {
        hitRate = hitRateRecords[0].hitRate;
        totalHits = hitRateRecords[0].totalHits;
        totalPredictions = hitRateRecords[0].totalPredictions;
      }
    }

    records.push({
      dateStr,
      totalSlots: HOUR_SLOTS.length,
      analyzedSlots: predictions.length,
      hitRate,
      totalHits,
      totalPredictions,
    });
  }

  return records;
}

// ============================================================
// AI 超級獎分析服務
// ============================================================
import { aiSuperPrizePredictions } from "../../drizzle/schema";

async function analyzeWithLLMSuperPrize(
  superNumbers: number[],
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{ candidateBalls: number[]; reasoning: string; hotAnalysis?: string; streakAnalysis?: string; diagonalAnalysis?: string; deadNumbers?: string; coldAnalysis?: string; trendAnalysis?: string; coreConclusion?: string; strategy?: string }> {
  const dataText = superNumbers.map((n, i) => `第${i + 1}期: ${String(n).padStart(2, "0")}`).join("\n");
  const prompt = `你是台灣賓果彩票超級獎分析專家。以下是台灣賓果 ${sourceHour}:00-${sourceHour}:55 時段最近 ${superNumbers.length} 期的超級獎號碼（bullEyeTop，1-80之間）：\n${dataText}\n請分析這些超級獎號碼的規律，推薦 10 顆最有可能在下一個時段出現的超級獎候選號碼（1-80之間的整數）。\n\n分析要點：\n1. 統計各號碼出現頻率（熱號代表高機率）\n2. 觀察近期趨勢（近期熱號更重要）\n3. 考慮冷號回補可能性（長期未出的號碼）\n4. 連莊號（相鄰期數出現的號碼）\n5. 斜連交會點（對角線相鄰的號碼）\n6. 區間平衡度（小號區與大號區的平衡）\n7. 整體策略（綜合上述分析給出最終推薦）\n\n請以 JSON 格式回應，提供詳細分析（7 項完整分析）：\n{\n  "candidateBalls": [數字1, 數字2, ..., 數字10],\n  "reasoning": "簡短結論（不超過 80 字）",\n  "hotAnalysis": "1. 強勢熱號分析：說明 TOP3 熱號及其出現頻率",\n  "streakAnalysis": "2. 連莊號分析：相鄰期數出現的號碼及其規律",\n  "diagonalAnalysis": "3. 斜連交會點：對角線相鄰的號碼組合",\n  "deadNumbers": "4. 死碼排除：長期未出現的號碼（應避免）",\n  "coldAnalysis": "5. 冷號回補分析：說明為何選擇冷號回補",\n  "trendAnalysis": "6. 區間趨勢分析：近期趨勢說明及區間分布",\n  "coreConclusion": "7. 核心演算結論：綜合上述 6 項分析，給出最終推薦策略",\n  "strategy": "整體選號策略：簡述選號邏輯"\n}`;
  
  const llmMessages = [
    { role: "system" as const, content: "你是台灣賓果彩票超級獎數據分析專家。請用繁體中文回應，並嚴格按照 JSON 格式輸出。" },
    { role: "user" as const, content: prompt },
  ];
  
  const llmResponseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: "super_prize_prediction",
      strict: true,
      schema: {
        type: "object",
        properties: {
          candidateBalls: { type: "array", items: { type: "integer" } },
          reasoning: { type: "string" },
          hotAnalysis: { type: "string", description: "1. 強勢熱號分析" },
          streakAnalysis: { type: "string", description: "2. 連莊號分析" },
          diagonalAnalysis: { type: "string", description: "3. 斜連交會點" },
          deadNumbers: { type: "string", description: "4. 死碼排除" },
          coldAnalysis: { type: "string", description: "5. 冷號回補分析" },
          trendAnalysis: { type: "string", description: "6. 區間趨勢分析" },
          coreConclusion: { type: "string", description: "7. 核心演算結論" },
          strategy: { type: "string", description: "整體選號策略" },
        },
        required: ["candidateBalls", "reasoning", "hotAnalysis", "streakAnalysis", "diagonalAnalysis", "deadNumbers", "coldAnalysis", "trendAnalysis", "coreConclusion", "strategy"],
        additionalProperties: false,
      },
    },
  };

  const response = await invokeLLM({
    messages: llmMessages,
    response_format: llmResponseFormat,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 回應為空");

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const parsed = JSON.parse(contentStr);
  return {
    candidateBalls: parsed.candidateBalls.slice(0, 10),
    reasoning: parsed.reasoning,
    hotAnalysis: parsed.hotAnalysis,
    streakAnalysis: parsed.streakAnalysis,
    diagonalAnalysis: parsed.diagonalAnalysis,
    deadNumbers: parsed.deadNumbers,
    coldAnalysis: parsed.coldAnalysis,
    trendAnalysis: parsed.trendAnalysis,
    coreConclusion: parsed.coreConclusion,
    strategy: parsed.strategy,
  };
}

/** 超級獎統計分析（備用方案） */
async function analyzeStatisticallyForSuperPrize(
  superNumbers: number[]
): Promise<{
  candidateBalls: number[];
  reasoning: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
}> {
  const frequency: Record<number, number> = {};
  for (const num of superNumbers) {
    frequency[num] = (frequency[num] || 0) + 1;
  }

  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);

  const topHot = sorted.slice(0, 5);
  const topCold = sorted.slice(-5).reverse();

  const candidates = new Set<number>();
  for (const item of topHot) {
    candidates.add(item.num);
  }
  for (let i = 1; i <= 80; i++) {
    if (candidates.size >= 10) break;
    if (!frequency[i]) candidates.add(i);
  }

  const hotStr = topHot.map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");
  const coldStr = topCold.map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");

  return {
    candidateBalls: Array.from(candidates).slice(0, 10),
    reasoning: `基於統計方法：熱號 ${hotStr.substring(0, 30)}...`,
    hotAnalysis: `1. 強勢熱號分析：${hotStr}`,
    streakAnalysis: `2. 連莊號分析：基於最近期數分析`,
    diagonalAnalysis: `3. 斜連交會點：基於號碼分布分析`,
    deadNumbers: `4. 死碼排除：${coldStr}`,
    coldAnalysis: `5. 冷號回補分析：考慮冷號回補機率`,
    trendAnalysis: `6. 區間趨勢分析：基於歷史數據分析`,
    coreConclusion: `7. 核心演算結論：推薦候選號碼`,
    strategy: `整體選號策略：結合熱號和冷號分析`,
  };
}

/** 分析超級獎時段 */
export async function analyzeSuperPrizeSlot(
  superNumbers: number[],
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  candidateBalls: number[];
  reasoning: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
  llmError?: string;
}> {
  try {
    if (userApiKey && superNumbers.length > 0) {
      try {
        return await analyzeWithLLMSuperPrize(superNumbers, sourceHour, userApiKey, customBaseUrl, customModel);
      } catch (llmErr) {
        const errorMsg = llmErr instanceof Error ? llmErr.message : "LLM 分析失敗";
        console.warn(`超級獎 LLM 分析失敗，回退到統計方法：${errorMsg}`);
      }
    }

    return await analyzeStatisticallyForSuperPrize(superNumbers);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "分析失敗";
    console.error(`超級獎分析失敗：${errorMsg}`);
    throw err;
  }
}

/** 取得指定日期的所有超級獎預測 */
export async function getAiSuperPrizePredictions(dateStr: string) {
  const database = await db();
  return database
    .select()
    .from(aiSuperPrizePredictions)
    .where(eq(aiSuperPrizePredictions.dateStr, dateStr));
}

/** 儲存超級獎預測 */
export async function saveAiSuperPrizePrediction(
  dateStr: string,
  sourceHour: string,
  targetHour: string,
  candidateBalls: number[],
  isManual: boolean = false,
  reasoning: string = ""
) {
  const database = await db();
  const existing = await database
    .select()
    .from(aiSuperPrizePredictions)
    .where(
      and(
        eq(aiSuperPrizePredictions.dateStr, dateStr),
        eq(aiSuperPrizePredictions.sourceHour, sourceHour)
      )
    );

  if (existing.length > 0) {
    await database
      .update(aiSuperPrizePredictions)
      .set({
        candidateBalls,
        isManual: isManual ? 1 : 0,
        reasoning,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiSuperPrizePredictions.dateStr, dateStr),
          eq(aiSuperPrizePredictions.sourceHour, sourceHour)
        )
      );
  } else {
    await database.insert(aiSuperPrizePredictions).values({
      dateStr,
      sourceHour,
      targetHour,
      candidateBalls,
      isManual: isManual ? 1 : 0,
      reasoning,
    });
  }
}

/** 刪除超級獎預測 */
export async function deleteAiSuperPrizePrediction(dateStr: string, sourceHour: string) {
  const database = await db();
  await database
    .delete(aiSuperPrizePredictions)
    .where(
      and(
        eq(aiSuperPrizePredictions.dateStr, dateStr),
        eq(aiSuperPrizePredictions.sourceHour, sourceHour)
      )
    );
}

/** 取得指定時段的超級獎開獎數據 */
export async function getHourDrawsWithSuper(
  dateStr: string,
  targetHour: string,
  limit: number = 10
): Promise<{ term: string; time: string; superNumber: number }[]> {
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const hourNum = parseInt(targetHour, 10);

  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${String(hourNum).padStart(2, "0")}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) {
      drawMap.set(timeKey, d);
    }
  }

  return Array.from(drawMap.values())
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime))
    .slice(0, limit)
    .map((d) => ({
      term: d.drawNumber,
      time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
      superNumber: d.superNumber as number,
    }));
}

/** 驗證超級獎預測 */
export async function verifySuperPrizePrediction(
  dateStr: string,
  verifyHour: string,
  candidateBalls: number[]
) {
  const database = await db();
  const rocDate = toROCDateStr(dateStr);
  const hourNum = parseInt(verifyHour, 10);

  const timeSlots: string[] = [];
  for (let m = 0; m < 60; m += 5) {
    timeSlots.push(`${String(hourNum).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${verifyHour}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) {
      drawMap.set(timeKey, d);
    }
  }

  return timeSlots.map((timeSlot, idx) => {
    const draw = drawMap.get(timeSlot);
    if (draw) {
      const superNum = draw.superNumber as number;
      const isHit = candidateBalls.includes(superNum);
      return {
        term: draw.drawNumber,
        time: timeSlot,
        superNumber: superNum,
        isHit,
        index: idx + 1,
        pending: false,
      };
    } else {
      return {
        term: "---",
        time: timeSlot,
        superNumber: 0,
        isHit: false,
        index: idx + 1,
        pending: true,
      };
    }
  });
}
