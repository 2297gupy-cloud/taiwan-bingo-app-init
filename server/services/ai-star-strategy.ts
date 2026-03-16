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
  const recentHot = Object.entries(recent5Freq)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => `${String(item.num).padStart(2, "0")}(${item.count}次)`).join(", ");

  // 號碼區間分布（1-20, 21-40, 41-60, 61-80）
  const zones = [0, 0, 0, 0];
  for (const draw of draws) {
    for (const num of draw.numbers) {
      if (num <= 20) zones[0]++;
      else if (num <= 40) zones[1]++;
      else if (num <= 60) zones[2]++;
      else zones[3]++;
    }
  }
  const totalNums = draws.length * 20;
  const zonePct = zones.map(z => Math.round(z / totalNums * 100));

  // 奇偶比例
  let oddCount = 0, evenCount = 0;
  for (const draw of draws) {
    for (const num of draw.numbers) {
      if (num % 2 === 1) oddCount++; else evenCount++;
    }
  }
  const oddPct = Math.round(oddCount / totalNums * 100);
  const evenPct = 100 - oddPct;

  // 追蹤期數（連續出現的號碼）
  const streakNums: string[] = [];
  for (const item of sorted.slice(0, 20)) {
    const streak = draws.filter(d => d.numbers.includes(item.num)).length;
    if (streak >= Math.ceil(draws.length * 0.6)) {
      streakNums.push(`${String(item.num).padStart(2, "0")}(連續${streak}期)`);
    }
  }

  return [
    `📊 頻率統計（${draws.length}期樣本）`,
    `熱號 TOP8：${topHot}`,
    `冷號 BOTTOM8：${topCold}`,
    `近 5 期熱號：${recentHot}`,
    streakNums.length > 0 ? `高頻連續號：${streakNums.join(", ")}` : "",
    `區間分布：1-20區(${zonePct[0]}%) | 21-40區(${zonePct[1]}%) | 41-60區(${zonePct[2]}%) | 61-80區(${zonePct[3]}%)`,
    `奇偶比例：奇號 ${oddPct}% | 偶號 ${evenPct}%`,
  ].filter(Boolean).join("\n");
}

/** 使用 LLM 智能分析開獎數據，推薦黃金球 */
async function analyzeWithLLM(
  draws: { term: string; time: string; numbers: number[] }[],
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{ goldenBalls: number[]; reasoning: string; fullAnalysis?: string; hotAnalysis?: string; streakAnalysis?: string; diagonalAnalysis?: string; deadNumbers?: string; coldAnalysis?: string; trendAnalysis?: string; coreConclusion?: string; strategy?: string }> {
  // 格式化開獎數據
  const drawLines = draws.map((d, idx) => {
    const nums = d.numbers.map((n) => String(n).padStart(2, "0")).join(" ");
    return `第${idx + 1}期 [${d.time}]: ${nums}`;
  });

  const dataText = drawLines.join("\n");  // 預先計算統計資料，將其嵌入 prompt
  const freqMap: Record<number, number> = {};
  for (const draw of draws) {
    for (const num of draw.numbers) {
      freqMap[num] = (freqMap[num] || 0) + 1;
    }
  }
  const sortedFreq = Object.entries(freqMap)
    .map(([n, c]) => ({ num: parseInt(n), count: c }))
    .sort((a, b) => b.count - a.count);
  const hot8 = sortedFreq.slice(0, 8).map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');
  const cold8 = sortedFreq.slice(-8).reverse().map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');
  const recent5Freq: Record<number, number> = {};
  for (const draw of draws.slice(0, 5)) {
    for (const num of draw.numbers) {
      recent5Freq[num] = (recent5Freq[num] || 0) + 1;
    }
  }
  const recent5Hot = Object.entries(recent5Freq)
    .map(([n, c]) => ({ num: parseInt(n), count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');
  const totalNums = draws.length * 20;
  const zones = [0,0,0,0];
  let oddCount = 0;
  for (const draw of draws) {
    for (const num of draw.numbers) {
      if (num <= 20) zones[0]++;
      else if (num <= 40) zones[1]++;
      else if (num <= 60) zones[2]++;
      else zones[3]++;
      if (num % 2 === 1) oddCount++;
    }
  }
  const zonePct = zones.map(z => Math.round(z / totalNums * 100));
  const oddPct = Math.round(oddCount / totalNums * 100);

  const prompt = `你是台灣賓果彩票分析專家。以下是台灣賓果 ${sourceHour}:00-${sourceHour}:55 時段最近 ${draws.length} 期開獎數據（每期從1-80中開出20個號碼）：

${dataText}

預計統計資料：
- 熱號 TOP8：${hot8}
- 冷號 BOTTOM8：${cold8}
- 近 5 期熱號：${recent5Hot}
- 區間分布：1-20區(${zonePct[0]}%) | 21-40區(${zonePct[1]}%) | 41-60區(${zonePct[2]}%) | 61-80區(${zonePct[3]}%)
- 奇偶比例：奇號 ${oddPct}% | 偶號 ${100-oddPct}%

請分析這些數據，找出規律，推薦 3 顏最有可能在下一個時段出現的「黃金球」號碼（1-80之間的整數）。

分析要點：
1. 統計各號碼出現頻率（熱號代表高機率）
2. 觀察近 5 期趨勢（近期熱號更重要）
3. 考慮冷號回補可能性（長期未出的號碼）
4. 區間平衡度（小號區與大號區的平衡）
5. 奇偶平衡
6. 連莊號（相鄰期數出現的號碼）
7. 斜連交會點（對角線相鄰的號碼）

請以 JSON 格式回應，提供詳細分析（7 項完整分析）：
\{
  "goldenBalls": [數字1, 數字2, 數字3],
  "reasoning": "簡短結論（不超過 80 字）",
  "hotAnalysis": "1. 強勢熱號分析：說明 TOP3 熱號及其出現頻率",
  "streakAnalysis": "2. 連莊號分析：相鄰期數出現的號碼及其規律",
  "diagonalAnalysis": "3. 斜連交會點：對角線相鄰的號碼組合",
  "deadNumbers": "4. 死碼排除：長期未出現的號碼（應避免）",
  "coldAnalysis": "5. 冷號回補分析：說明為何選擇冷號回補",
  "trendAnalysis": "6. 區間趨勢分析：近 5 期趨勢說明及區間分布",
  "coreConclusion": "7. 核心演算結論（5期策略）：綜合上述 6 項分析，給出最終推薦策略",
  "strategy": "整體選號策略：簡述選號邏輯"
\}`;

  // 準備 LLM 請求參數
  const llmMessages = [
    {
      role: "system" as const,
      content: "你是台灣賓果彩票數據分析專家，專門分析開獎規律。請用繁體中文回應，並嚴格按照 JSON 格式輸出。",
    },
    {
      role: "user" as const,
      content: prompt,
    },
  ];
  const llmResponseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: "bingo_prediction",
      strict: true,
      schema: {
        type: "object",
        properties: {
          goldenBalls: {
            type: "array",
            items: { type: "integer" },
            description: "推薦的3顏黃金球號碼，每個號碼在1-80之間",
          },
          reasoning: {
            type: "string",
            description: "簡短結論（不超過 80 字）",
          },
          hotAnalysis: {
            type: "string",
            description: "1. 強勢熱號分析",
          },
          streakAnalysis: {
            type: "string",
            description: "2. 連莊號分析",
          },
          diagonalAnalysis: {
            type: "string",
            description: "3. 斜連交會點",
          },
          deadNumbers: {
            type: "string",
            description: "4. 死碼排除",
          },
          coldAnalysis: {
            type: "string",
            description: "5. 冷號回補分析",
          },
          trendAnalysis: {
            type: "string",
            description: "6. 區間趨勢分析",
          },
          coreConclusion: {
            type: "string",
            description: "7. 核心演算結論（5期策略）",
          },
          strategy: {
            type: "string",
            description: "整體選號策略",
          },
        },
        required: ["goldenBalls", "reasoning", "hotAnalysis", "streakAnalysis", "diagonalAnalysis", "deadNumbers", "coldAnalysis", "trendAnalysis", "coreConclusion", "strategy"],
        additionalProperties: false,
      },
    },
  };

  try {
    let response;
    // 根據 API Key 格式自動判斷模型
    if (userApiKey) {
      if (customBaseUrl) {
        // 第三方 API 代理服務（如向量引擎），使用自訂 Base URL
        const cleanBaseUrl = customBaseUrl.replace(/\/+$/, "");
        let endpoint = cleanBaseUrl;
        if (!endpoint.endsWith("/chat/completions")) {
          if (!endpoint.endsWith("/v1")) {
            endpoint = endpoint + "/v1";
          }
          endpoint = endpoint + "/chat/completions";
        }
        const modelName = customModel || "gemini-2.0-flash-lite";
        const customPayload = {
          model: modelName,
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const customRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(customPayload),
        });
        if (!customRes.ok) {
          const errText = await customRes.text();
          throw new Error(`第三方 API 錯誤: ${customRes.status} ${errText}`);
        }
        response = await customRes.json();
      } else if (userApiKey.startsWith("sk-")) {
        // OpenAI Key
        const openaiPayload = {
          model: "gpt-4o-mini",
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(openaiPayload),
        });
        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          throw new Error(`OpenAI API 錯誤: ${openaiRes.status} ${errText}`);
        }
        response = await openaiRes.json();
      } else if (userApiKey.startsWith("AIza")) {
        // Gemini Key
        const geminiPayload = {
          model: "gemini-2.0-flash",
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(geminiPayload),
        });
        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Gemini API 錯誤: ${geminiRes.status} ${errText}`);
        }
        response = await geminiRes.json();
      } else {
        throw new Error("無法識別的 API Key 格式（應為 sk-* 或 AIza*）");
      }
    } else {
      // 使用系統內建 Key
      response = await invokeLLM({
        messages: llmMessages,
        response_format: llmResponseFormat,
      });
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("LLM 無回應");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content);
    const goldenBalls = (parsed.goldenBalls as number[])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 80)
      .slice(0, 3);

    if (goldenBalls.length < 1) throw new Error("LLM 未返回有效號碼");

    // 構建完整分析說明
    const frequencyAnalysis = buildFrequencyAnalysis(draws);
    const fullAnalysis = `【完整分析過程】

${frequencyAnalysis}

【AI 推理結論】
${parsed.reasoning || "AI 智能分析完成"}`;

    return {
      goldenBalls: goldenBalls.sort((a, b) => a - b),
      reasoning: parsed.reasoning || "AI 智能分析完成",
      fullAnalysis: fullAnalysis,
      hotAnalysis: parsed.hotAnalysis || "",
      streakAnalysis: parsed.streakAnalysis || "",
      diagonalAnalysis: parsed.diagonalAnalysis || "",
      deadNumbers: parsed.deadNumbers || "",
      coldAnalysis: parsed.coldAnalysis || "",
      trendAnalysis: parsed.trendAnalysis || "",
      coreConclusion: parsed.coreConclusion || "",
      strategy: parsed.strategy || "",
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
  const coldNumbers_display = coldNumbers.map((n) => String(n).padStart(2, "0")).join(", ");
  
  // 計算熱號的出現頻率
  const hotFreqs = hotNumbers.map(n => frequency[n]);
  const avgFreq = Math.round(hotFreqs.reduce((a, b) => a + b, 0) / hotFreqs.length);
  
  // 計算冷號的出現頻率
  const coldFreqs = coldNumbers.map(n => frequency[n]);
  const coldAvgFreq = coldFreqs.length > 0 ? Math.round(coldFreqs.reduce((a, b) => a + b, 0) / coldFreqs.length) : 0;
  
  const reasoning = `統計分析 ${draws.length} 期 ${sourceHour}時段：
熱號：${topHot}（平均出現 ${avgFreq} 次）
冷號：${coldNumbers_display}（平均出現 ${coldAvgFreq} 次）
策略：混合冷熱號碼，熱號代表高概率，冷號代表回補機會
推薦球號：${goldenBalls.map(n => String(n).padStart(2, "0")).join(", ")}`;

  return { goldenBalls, reasoning };
}

/** 分析指定時段的開獎數據，返回黃金球推薦（優先使用 LLM，失敗則使用統計方法） */
export async function analyzeHourSlot(
  dateStr: string,
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  sampleCount: number;
  usedLLM: boolean;
  llmError?: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
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
      hotAnalysis: "無數據",
      streakAnalysis: "無數據",
      diagonalAnalysis: "無數據",
      deadNumbers: "無數據",
      coldAnalysis: "無數據",
      trendAnalysis: "無數據",
      coreConclusion: "無數據",
      strategy: "無數據",
    };
  }

  const drawsForAnalysis = allDraws.map((d: DrawRecord) => ({
    term: d.drawNumber,
    time: d.drawTime.split(" ")[1]?.substring(0, 5) || "",
    numbers: d.numbers as number[],
  }));

  // 試試 LLM 分析
  let usedLLM = false;
  let result: any = { goldenBalls: [], reasoning: "" };
  let llmError: string | undefined;

  try {
    result = await analyzeWithLLM(drawsForAnalysis, sourceHour, userApiKey, customBaseUrl, customModel);
    usedLLM = true;
    const keyType = customBaseUrl ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})` : userApiKey?.startsWith("sk-") ? "OpenAI Key" : userApiKey?.startsWith("AIza") ? "Gemini Key" : "系統內建 Key";
    console.log(`[analyzeHourSlot] LLM 分析成功（${keyType}），時段 ${sourceHour}:`, result.goldenBalls);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    llmError = errMsg;
    console.log(`[analyzeHourSlot] LLM 失敗，使用統計方法，時段 ${sourceHour}:`, errMsg);
    const statsResult = analyzeWithStats(drawsForAnalysis, sourceHour);
    result = { ...result, ...statsResult };
    usedLLM = false;
  }

  let analysis7Items = {
    hotAnalysis: result.hotAnalysis || "",
    streakAnalysis: result.streakAnalysis || "",
    diagonalAnalysis: result.diagonalAnalysis || "",
    deadNumbers: result.deadNumbers || "",
    coldAnalysis: result.coldAnalysis || "",
    trendAnalysis: result.trendAnalysis || "",
    coreConclusion: result.coreConclusion || "",
    strategy: result.strategy || "",
  };

  if (!usedLLM && !analysis7Items.hotAnalysis) {
    const frequency: Record<number, number> = {};
    for (const draw of drawsForAnalysis) {
      for (const num of draw.numbers) {
        frequency[num] = (frequency[num] || 0) + 1;
      }
    }
    const sorted = Object.entries(frequency)
      .map(([num, count]) => ({ num: parseInt(num), count }))
      .sort((a, b) => b.count - a.count);
    
    const hot8 = sorted.slice(0, 8).map(x => `${String(x.num).padStart(2, "0")}(${x.count}次)`).join(", ");
    const cold8 = sorted.slice(-8).reverse().map(x => `${String(x.num).padStart(2, "0")}(${x.count}次)`).join(", ");
    const recent5Hot = drawsForAnalysis.slice(0, 5).flatMap(d => d.numbers).filter((n, i, arr) => arr.indexOf(n) === i).slice(0, 5).join(", ");
    
    const recent5Draws = drawsForAnalysis.slice(0, 5);
    const recent5Freq: Record<number, number> = {};
    for (const draw of recent5Draws) {
      for (const num of draw.numbers) {
        recent5Freq[num] = (recent5Freq[num] || 0) + 1;
      }
    }
    const recent5Sorted = Object.entries(recent5Freq)
      .map(([num, count]) => ({ num: parseInt(num), count }))
      .sort((a, b) => b.count - a.count);
    const recent5TopHot = recent5Sorted.slice(0, 3).map(x => String(x.num).padStart(2, "0")).join(", ");
    
    const streakMap: Record<number, number> = {};
    for (let i = 0; i < recent5Draws.length - 1; i++) {
      for (const num of recent5Draws[i].numbers) {
        if (recent5Draws[i + 1].numbers.includes(num)) {
          streakMap[num] = (streakMap[num] || 0) + 1;
        }
      }
    }
    const streakNums = Object.entries(streakMap)
      .filter(([_, count]) => count > 0)
      .map(([num, count]) => `${String(num).padStart(2, "0")}(${count}連)`)
      .join(", ") || "無連莊";
    
    const allNums = new Set<number>();
    for (let i = 1; i <= 80; i++) allNums.add(i);
    for (const draw of recent5Draws) {
      for (const num of draw.numbers) {
        allNums.delete(num);
      }
    }
    const deadNums = Array.from(allNums).slice(0, 5).map(n => String(n).padStart(2, "0")).join(", ");
    
    analysis7Items = {
      hotAnalysis: `熱號 TOP8：${hot8}`,
      streakAnalysis: `5期連莊：${streakNums}`,
      diagonalAnalysis: "統計方法無斜連分析",
      deadNumbers: `5期死碼（前5個）：${deadNums}`,
      coldAnalysis: `冷號 BOTTOM8：${cold8}`,
      trendAnalysis: `近 5 期熱號：${recent5Hot}\n5期TOP3熱號：${recent5TopHot}`,
      coreConclusion: `5期策略：優先推薦 ${recent5TopHot}，搭配連莊號 ${streakNums.split("(")[0].trim()}，避開死碼 ${deadNums.split(",")[0]}`,
      strategy: "混合冷熱號碼策略",
    };
  }

  return {
    ...result,
    ...analysis7Items,
    sampleCount: allDraws.length,
    usedLLM,
    llmError,
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
    superNumber: d.superNumber as number,
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

/** 驗證預測結果：比對黃金球是否命中驗證時段的開獎
 * verifyHour: 實際要驗證的時段（卡片顯示時段+1）
 * 例：08時卡片的黃金球 → 驗證 09:00~09:55
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
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(
      and(
        like(drawRecords.drawTime, `${rocDate}%`),
        like(drawRecords.drawTime, `% ${sourceHour}:%`)
      )
    )
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);

  // 用 drawTime 去重（同一時間可能有新舊格式期號），只取前 12 筆
  const seen = new Set<string>();
  const draws: typeof allDraws = [];
  for (const d of allDraws) {
    const timeKey = d.drawTime;
    if (!seen.has(timeKey)) {
      seen.add(timeKey);
      draws.push(d);
    }
    if (draws.length >= 12) break;
  }

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
    const superNum = draw.superNumber ? `超級獎${String(draw.superNumber).padStart(2, '0')}` : '';
    return `${draw.drawNumber}\n${timePart}\t${numbers}\t${superNum}\t${bigSmall}\t${oddEven}`;
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
  
  try {
    let response;
    // 根據 API Key 格式自動判斷模型
    if (userApiKey) {
      if (customBaseUrl) {
        // 第三方 API 代理服務（如向量引擎），使用自訂 Base URL
        const cleanBaseUrl = customBaseUrl.replace(/\/+$/, "");
        let endpoint = cleanBaseUrl;
        if (!endpoint.endsWith("/chat/completions")) {
          if (!endpoint.endsWith("/v1")) {
            endpoint = endpoint + "/v1";
          }
          endpoint = endpoint + "/chat/completions";
        }
        const modelName = customModel || "gemini-2.0-flash-lite";
        const customPayload = {
          model: modelName,
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const customRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(customPayload),
        });
        if (!customRes.ok) {
          const errText = await customRes.text();
          throw new Error(`第三方 API 錯誤: ${customRes.status} ${errText}`);
        }
        response = await customRes.json();
      } else if (userApiKey.startsWith("sk-")) {
        // OpenAI Key
        const openaiPayload = {
          model: "gpt-4o-mini",
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(openaiPayload),
        });
        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          throw new Error(`OpenAI API 錯誤: ${openaiRes.status} ${errText}`);
        }
        response = await openaiRes.json();
      } else if (userApiKey.startsWith("AIza")) {
        // Gemini Key
        const geminiPayload = {
          model: "gemini-2.0-flash",
          messages: llmMessages,
          response_format: llmResponseFormat,
        };
        const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userApiKey}`,
          },
          body: JSON.stringify(geminiPayload),
        });
        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Gemini API 錯誤: ${geminiRes.status} ${errText}`);
        }
        response = await geminiRes.json();
      } else {
        throw new Error("無法識別的 API Key 格式（應為 sk-* 或 AIza*）");
      }
    } else {
      // 使用系統內建 Key
      response = await invokeLLM({
        messages: llmMessages,
        response_format: llmResponseFormat,
      });
    }
    
    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("LLM 無回應");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);
    const candidateBalls = (parsed.candidateBalls as number[])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 80)
      .slice(0, 10);
    if (candidateBalls.length < 1) throw new Error("LLM 未返回有效號碼");
    return {
      candidateBalls: candidateBalls.sort((a, b) => a - b),
      reasoning: parsed.reasoning || "AI 智能分析完成",
      hotAnalysis: parsed.hotAnalysis || "",
      streakAnalysis: parsed.streakAnalysis || "",
      diagonalAnalysis: parsed.diagonalAnalysis || "",
      deadNumbers: parsed.deadNumbers || "",
      coldAnalysis: parsed.coldAnalysis || "",
      trendAnalysis: parsed.trendAnalysis || "",
      coreConclusion: parsed.coreConclusion || "",
      strategy: parsed.strategy || "",
    };
  } catch (err) {
    console.error("[analyzeWithLLMSuperPrize] LLM 分析失敗，回退到統計方法:", err instanceof Error ? err.message : String(err));
    throw err;
  }
}

function analyzeWithStatsSuperPrize(superNumbers: number[]): { candidateBalls: number[]; reasoning: string } {
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) frequency[i] = 0;
  for (const n of superNumbers) frequency[n] = (frequency[n] || 0) + 1;
  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);
  const hot = sorted.slice(0, 7).map(x => x.num);
  const cold = sorted.slice(-10).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.num);
  const combined = Array.from(new Set([...hot, ...cold])).slice(0, 10);
  combined.sort((a, b) => a - b);
  return { candidateBalls: combined, reasoning: `統計分析 ${superNumbers.length} 期超級獎：熱號混合冷號策略` };
}

export async function analyzeSuperPrizeSlot(
  dateStr: string,
  sourceHour: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  candidateBalls: number[];
  reasoning: string;
  sampleCount: number;
  usedLLM: boolean;
  llmError?: string;
  hotAnalysis?: string;
  streakAnalysis?: string;
  diagonalAnalysis?: string;
  deadNumbers?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  coreConclusion?: string;
  strategy?: string;
}> {
  const database = await db();
  const allDraws = await database
    .select()
    .from(drawRecords)
    .where(like(drawRecords.drawTime, `%${sourceHour}:%`))
    .orderBy(desc(drawRecords.drawNumber))
    .limit(15);
  if (allDraws.length === 0) {
    return { candidateBalls: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70], reasoning: "數據不足，使用預設推薦號碼", sampleCount: 0, usedLLM: false };
  }
  const superNumbers = allDraws.map(d => d.superNumber as number).filter(n => n >= 1 && n <= 80);
  let usedLLM = false;
  let llmError: string | undefined;
  let result: any = { candidateBalls: [], reasoning: "" };
  try {
    result = await analyzeWithLLMSuperPrize(superNumbers, sourceHour, userApiKey, customBaseUrl, customModel);
    const keyType = customBaseUrl ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})` : userApiKey?.startsWith("sk-") ? "OpenAI Key" : userApiKey?.startsWith("AIza") ? "Gemini Key" : "系統內建 Key";
    console.log(`[analyzeSuperPrizeSlot] LLM 分析成功（${keyType}），時段 ${sourceHour}:`, result.candidateBalls);
    usedLLM = true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    llmError = errMsg;
    console.log(`[analyzeSuperPrizeSlot] LLM 失敗，使用統計方法，時段 ${sourceHour}:`, errMsg);
    const statsResult = analyzeWithStatsSuperPrize(superNumbers);
    result = { ...result, ...statsResult };
    usedLLM = false;
  }
  return { ...result, sampleCount: allDraws.length, usedLLM, llmError };
}

export async function getAiSuperPrizePredictions(dateStr: string) {
  const database = await db();
  const predictions = await database
    .select()
    .from(aiSuperPrizePredictions)
    .where(eq(aiSuperPrizePredictions.dateStr, dateStr))
    .orderBy(aiSuperPrizePredictions.sourceHour);
  return predictions.map(p => ({
    id: p.id,
    dateStr: p.dateStr,
    sourceHour: p.sourceHour,
    targetHour: p.targetHour,
    candidateBalls: p.candidateBalls as number[],
    isManual: p.isManual === 1,
    reasoning: p.reasoning,
  }));
}

export async function saveAiSuperPrizePrediction(
  dateStr: string,
  sourceHour: string,
  targetHour: string,
  candidateBalls: number[],
  isManual: boolean,
  reasoning?: string
) {
  const database = await db();
  const existing = await database
    .select()
    .from(aiSuperPrizePredictions)
    .where(and(eq(aiSuperPrizePredictions.dateStr, dateStr), eq(aiSuperPrizePredictions.sourceHour, sourceHour)))
    .limit(1);
  if (existing.length > 0) {
    await database.update(aiSuperPrizePredictions)
      .set({ targetHour, candidateBalls, isManual: isManual ? 1 : 0, reasoning: reasoning || null })
      .where(eq(aiSuperPrizePredictions.id, existing[0].id));
  } else {
    await database.insert(aiSuperPrizePredictions).values({ dateStr, sourceHour, targetHour, candidateBalls, isManual: isManual ? 1 : 0, reasoning: reasoning || null });
  }
}

export async function deleteAiSuperPrizePrediction(dateStr: string, sourceHour: string) {
  const database = await db();
  await database.delete(aiSuperPrizePredictions)
    .where(and(eq(aiSuperPrizePredictions.dateStr, dateStr), eq(aiSuperPrizePredictions.sourceHour, sourceHour)));
}

export async function getHourDrawsWithSuper(dateStr: string, targetHour: string) {
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
    superNumber: d.superNumber as number,
    pending: false,
  }));
}

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
    .where(and(like(drawRecords.drawTime, `${rocDate}%`), like(drawRecords.drawTime, `% ${verifyHour}:%`)))
    .orderBy(desc(drawRecords.drawTime))
    .limit(30);
  const drawMap = new Map<string, typeof allDraws[0]>();
  for (const d of allDraws) {
    const timeKey = d.drawTime.split(" ")[1]?.substring(0, 5) || "";
    if (!drawMap.has(timeKey)) drawMap.set(timeKey, d);
  }
  return timeSlots.map((timeSlot, idx) => {
    const draw = drawMap.get(timeSlot);
    if (draw) {
      const superNum = draw.superNumber as number;
      const isHit = candidateBalls.includes(superNum);
      const numbers = draw.numbers as number[];
      const normalHits = numbers.filter(n => candidateBalls.includes(n));
      return {
        term: draw.drawNumber,
        time: timeSlot,
        superNumber: superNum,
        isHit,
        normalHits,
        normalHitCount: normalHits.length,
        index: idx + 1,
        pending: false
      };
    } else {
      return {
        term: "---",
        time: timeSlot,
        superNumber: 0,
        isHit: false,
        normalHits: [] as number[],
        normalHitCount: 0,
        index: idx + 1,
        pending: true
      };
    }
  });
}

/** 批量分析所有時段的超級獎候選球 */
export async function batchAnalyzeSuperPrizeSlots(
  dateStr: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    sourceHour: string;
    success: boolean;
    candidateBalls?: number[];
    error?: string;
  }>;
}> {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  for (const slot of HOUR_SLOTS) {
    try {
      const result = await analyzeSuperPrizeSlot(dateStr, slot.source, userApiKey, customBaseUrl, customModel);
      await saveAiSuperPrizePrediction(
        dateStr,
        slot.source,
        slot.target,
        result.candidateBalls,
        false,
        result.reasoning
      );
      results.push({
        sourceHour: slot.source,
        success: true,
        candidateBalls: result.candidateBalls,
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

/**
 * 解析複製的開獎數據文字
 * 支援格式：
 * 115014950
 * 17:55  06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79  超級獎67  大  單
 */
export function parseRawDrawData(rawText: string): {
  draws: { term: string; time: string; numbers: number[]; superNumber?: number }[];
  parseErrors: string[];
} {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const draws: { term: string; time: string; numbers: number[]; superNumber?: number }[] = [];
  const parseErrors: string[] = [];

  let currentTerm = "";
  for (const line of lines) {
    // 跳過分隔線
    if (line.startsWith("---") || line.startsWith("===")) continue;
    // 跳過標題行
    if (line.includes("演算報告") || line.includes("報告日期") || line.includes("1.") || line.includes("2.") || line.includes("3.") || line.includes("4.") || line.includes("5.") || line.includes("6.") || line.includes("7.")) continue;

    // 嘗試識別期號行（純數字，如 115014950）
    if (/^\d{9,12}$/.test(line)) {
      currentTerm = line;
      continue;
    }

    // 嘗試識別開獎數據行（以時間開頭，如 17:55 或 17:55\t）
    const timeMatch = line.match(/^(\d{1,2}:\d{2})\s+(.+)/);
    if (timeMatch) {
      const time = timeMatch[1];
      const rest = timeMatch[2];

      // 提取所有數字（1-80 範圍）
      const allNums = rest.match(/\b(\d{1,2})\b/g)?.map(Number) || [];
      const numbers = allNums.filter(n => n >= 1 && n <= 80);

      // 嘗試提取超級獎號碼（「超級獎XX」格式）
      const superMatch = rest.match(/超級獎(\d{1,2})/);
      const superNumber = superMatch ? parseInt(superMatch[1]) : undefined;

      if (numbers.length >= 10) {
        draws.push({
          term: currentTerm || `${time}`,
          time,
          numbers: numbers.slice(0, 20), // 最多取 20 個
          superNumber,
        });
      } else {
        parseErrors.push(`無法解析行：${line.substring(0, 50)}`);
      }
      continue;
    }

    // 嘗試識別純數字行（空格分隔的號碼）
    const numsOnly = line.match(/^[\d\s]+$/);
    if (numsOnly) {
      const numbers = line.split(/\s+/).map(Number).filter(n => n >= 1 && n <= 80);
      if (numbers.length >= 10) {
        draws.push({
          term: currentTerm || `row${draws.length + 1}`,
          time: "",
          numbers: numbers.slice(0, 20),
        });
      }
    }
  }

  return { draws, parseErrors };
}

/**
 * 分析自訂貼入的開獎數據，執行 7 項專業演算
 * 1. 強勢熱門號 + 尾數共振偵測
 * 2. 穩定連莊號（連續出現的號碼）
 * 3. 斜連交會點（相鄰期的共同號碼趨勢）
 * 4. 斜連跨度縮小 + 死碼排除
 * 5. 冷號回補分析
 * 6. 區間分布平衡
 * 7. 核心演算結論（5期策略）
 */
export async function analyzeCustomData(
  rawText: string,
  userApiKey?: string | null,
  customBaseUrl?: string | null,
  customModel?: string | null
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  hotAnalysis: string;
  coldAnalysis: string;
  trendAnalysis: string;
  tailResonance: string;
  streakAnalysis: string;
  diagonalAnalysis: string;
  deadNumbers: string;
  coreConclusion: string;
  strategy: string;
  sampleCount: number;
  usedLLM: boolean;
  parseErrors: string[];
}> {
  // 解析原始數據
  const { draws, parseErrors } = parseRawDrawData(rawText);

  if (draws.length === 0) {
    return {
      goldenBalls: [],
      reasoning: "無法解析輸入的數據，請確認格式正確",
      hotAnalysis: "",
      coldAnalysis: "",
      trendAnalysis: "",
      tailResonance: "",
      streakAnalysis: "",
      diagonalAnalysis: "",
      deadNumbers: "",
      coreConclusion: "",
      strategy: "",
      sampleCount: 0,
      usedLLM: false,
      parseErrors,
    };
  }

  // 預計算統計資料
  const freqMap: Record<number, number> = {};
  for (const draw of draws) {
    for (const num of draw.numbers) {
      freqMap[num] = (freqMap[num] || 0) + 1;
    }
  }
  const sortedFreq = Object.entries(freqMap)
    .map(([n, c]) => ({ num: parseInt(n), count: c }))
    .sort((a, b) => b.count - a.count);

  const hot8 = sortedFreq.slice(0, 8).map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');
  const cold8 = sortedFreq.slice(-8).reverse().map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');

  // 近 5 期熱號
  const recent5 = draws.slice(0, 5);
  const recent5Freq: Record<number, number> = {};
  for (const draw of recent5) {
    for (const num of draw.numbers) {
      recent5Freq[num] = (recent5Freq[num] || 0) + 1;
    }
  }
  const recent5Hot = Object.entries(recent5Freq)
    .map(([n, c]) => ({ num: parseInt(n), count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(x => `${String(x.num).padStart(2,'0')}(${x.count}次)`).join(', ');

  // 尾數共振（相同尾數的號碼出現頻率）
  const tailFreq: Record<number, number> = {};
  for (const draw of draws) {
    for (const num of draw.numbers) {
      const tail = num % 10;
      tailFreq[tail] = (tailFreq[tail] || 0) + 1;
    }
  }
  const hotTails = Object.entries(tailFreq)
    .sort((a, b) => parseInt(b[1].toString()) - parseInt(a[1].toString()))
    .slice(0, 3)
    .map(([tail, count]) => `尾數${tail}(${count}次)`)
    .join(', ');

  // 連莊號（在最近 3 期都出現的號碼）
  const streakNums: number[] = [];
  if (draws.length >= 3) {
    const sets = draws.slice(0, 3).map(d => new Set(d.numbers));
    for (let n = 1; n <= 80; n++) {
      if (sets.every(s => s.has(n))) streakNums.push(n);
    }
  }
  const streakDisplay = streakNums.length > 0
    ? streakNums.map(n => String(n).padStart(2,'0')).join(', ')
    : "無三連莊號";

  // 二連莊（最近 2 期共同號碼）
  const twoStreak: number[] = [];
  if (draws.length >= 2) {
    const set0 = new Set(draws[0].numbers);
    const set1 = new Set(draws[1].numbers);
    for (let n = 1; n <= 80; n++) {
      if (set0.has(n) && set1.has(n)) twoStreak.push(n);
    }
  }
  const twoStreakDisplay = twoStreak.length > 0
    ? twoStreak.map(n => String(n).padStart(2,'0')).join(', ')
    : "無二連莊號";

  // 斜連交會點（相鄰期共同號碼的交叉趨勢）
  const diagonalPoints: number[] = [];
  if (draws.length >= 3) {
    const pairFreq: Record<number, number> = {};
    for (let i = 0; i < Math.min(draws.length - 1, 4); i++) {
      const setA = new Set(draws[i].numbers);
      const setB = new Set(draws[i+1].numbers);
      for (let n = 1; n <= 80; n++) {
        if (setA.has(n) && setB.has(n)) {
          pairFreq[n] = (pairFreq[n] || 0) + 1;
        }
      }
    }
    Object.entries(pairFreq)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([n]) => diagonalPoints.push(parseInt(n)));
  }
  const diagonalDisplay = diagonalPoints.length > 0
    ? diagonalPoints.map(n => String(n).padStart(2,'0')).join(', ')
    : "無明顯斜連交會點";

  // 死碼（最近 5 期都未出現的號碼）
  const deadNums: number[] = [];
  const recent5Set = new Set(recent5.flatMap(d => d.numbers));
  for (let n = 1; n <= 80; n++) {
    if (!recent5Set.has(n)) deadNums.push(n);
  }
  const deadDisplay = deadNums.slice(0, 10).map(n => String(n).padStart(2,'0')).join(', ');

  // 區間分布
  const totalNums = draws.length * 20;
  const zones = [0,0,0,0];
  let oddCount = 0;
  for (const draw of draws) {
    for (const num of draw.numbers) {
      if (num <= 20) zones[0]++;
      else if (num <= 40) zones[1]++;
      else if (num <= 60) zones[2]++;
      else zones[3]++;
      if (num % 2 === 1) oddCount++;
    }
  }
  const zonePct = zones.map(z => Math.round(z / totalNums * 100));
  const oddPct = Math.round(oddCount / totalNums * 100);

  // 格式化開獎數據文字
  const dataText = draws.map((d, idx) => {
    const nums = d.numbers.map(n => String(n).padStart(2,'0')).join(' ');
    const superStr = d.superNumber ? ` 超級獎${String(d.superNumber).padStart(2,'0')}` : '';
    return `第${idx+1}期 [${d.time || d.term}]: ${nums}${superStr}`;
  }).join('\n');

  const prompt = `你是台灣賓果彩票專業數據演算專家。以下是用戶提供的開獎數據（${draws.length}期，每期從1-80中開出20個號碼）：

${dataText}

預計統計資料：
- 熱號 TOP8：${hot8}
- 冷號 BOTTOM8：${cold8}
- 近 5 期熱號：${recent5Hot}
- 熱尾數：${hotTails}
- 三連莊號：${streakDisplay}
- 二連莊號（最近2期共同）：${twoStreakDisplay}
- 斜連交會點：${diagonalDisplay}
- 近5期死碼（未出現）：${deadDisplay}
- 區間分布：1-20區(${zonePct[0]}%) | 21-40區(${zonePct[1]}%) | 41-60區(${zonePct[2]}%) | 61-80區(${zonePct[3]}%)
- 奇偶比例：奇號 ${oddPct}% | 偶號 ${100-oddPct}%

請按照以下 7 個專業演算要點分析，推薦 3 顆最有可能在下一期出現的「黃金球」號碼（1-80之間的整數）：

1. 強勢熱門號 + 尾數共振偵測（熱號中尾數相同的號碼有共振效應）
2. 穩定連莊號（連續多期出現的號碼，捕捉剛起步的二連莊趨勢）
3. 斜連交會點（相鄰期共同號碼的交叉趨勢，鎖定高機率落球區）
4. 斜連跨度縮小 + 精準死碼排除（避開近期完全未出現的號碼）
5. 冷號回補分析（長期未出現但統計上應該回補的號碼）
6. 區間分布平衡（考慮各區間的比例平衡）
7. 核心演算結論（5期策略：預計期數/推薦組合重點/策略邏輯）

請以 JSON 格式回應，提供完整的 7 項分析：
{
  "goldenBalls": [數字1, 數字2, 數字3],
  "reasoning": "核心結論（不超過 100 字）",
  "hotAnalysis": "1. 強勢熱門號 + 尾數共振分析",
  "streakAnalysis": "2. 連莊號分析（二連莊/三連莊趨勢）",
  "diagonalAnalysis": "3. 斜連交會點分析",
  "deadNumbers": "4. 死碼排除說明",
  "coldAnalysis": "5. 冷號回補分析",
  "trendAnalysis": "6. 區間分布趨勢分析",
  "coreConclusion": "7. 核心演算結論（5期策略）：預計期數/推薦組合/策略邏輯",
  "strategy": "整體選號策略說明"
}`;

  const llmMessages = [
    {
      role: "system" as const,
      content: "你是台灣賓果彩票專業數據演算專家，擅長尾數共振、連莊號、斜連交會點等進階演算技術。請用繁體中文回應，並嚴格按照 JSON 格式輸出。",
    },
    { role: "user" as const, content: prompt },
  ];

  const llmResponseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: "bingo_custom_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          goldenBalls: { type: "array", items: { type: "integer" }, description: "推薦的3顆黃金球號碼" },
          reasoning: { type: "string", description: "核心結論" },
          hotAnalysis: { type: "string", description: "強勢熱門號 + 尾數共振分析" },
          streakAnalysis: { type: "string", description: "連莊號分析" },
          diagonalAnalysis: { type: "string", description: "斜連交會點分析" },
          deadNumbers: { type: "string", description: "死碼排除說明" },
          coldAnalysis: { type: "string", description: "冷號回補分析" },
          trendAnalysis: { type: "string", description: "區間分布趨勢分析" },
          coreConclusion: { type: "string", description: "核心演算結論（5期策略）" },
          strategy: { type: "string", description: "整體選號策略" },
        },
        required: ["goldenBalls", "reasoning", "hotAnalysis", "streakAnalysis", "diagonalAnalysis", "deadNumbers", "coldAnalysis", "trendAnalysis", "coreConclusion", "strategy"],
        additionalProperties: false,
      },
    },
  };

  try {
    let response;
    if (userApiKey) {
      if (customBaseUrl) {
        const cleanBaseUrl = customBaseUrl.replace(/\/+$/, "");
        let endpoint = cleanBaseUrl;
        if (!endpoint.endsWith("/chat/completions")) {
          if (!endpoint.endsWith("/v1")) endpoint = endpoint + "/v1";
          endpoint = endpoint + "/chat/completions";
        }
        const modelName = customModel || "gemini-2.0-flash-lite";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userApiKey}` },
          body: JSON.stringify({ model: modelName, messages: llmMessages, response_format: llmResponseFormat }),
        });
        if (!res.ok) throw new Error(`第三方 API 錯誤: ${res.status} ${await res.text()}`);
        response = await res.json();
      } else if (userApiKey.startsWith("sk-")) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userApiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: llmMessages, response_format: llmResponseFormat }),
        });
        if (!res.ok) throw new Error(`OpenAI API 錯誤: ${res.status} ${await res.text()}`);
        response = await res.json();
      } else if (userApiKey.startsWith("AIza")) {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userApiKey}` },
          body: JSON.stringify({ model: "gemini-2.0-flash", messages: llmMessages, response_format: llmResponseFormat }),
        });
        if (!res.ok) throw new Error(`Gemini API 錯誤: ${res.status} ${await res.text()}`);
        response = await res.json();
      } else {
        throw new Error("無法識別的 API Key 格式");
      }
    } else {
      response = await invokeLLM({ messages: llmMessages, response_format: llmResponseFormat });
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("LLM 無回應");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);

    const goldenBalls = (parsed.goldenBalls as number[])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 80)
      .slice(0, 3)
      .sort((a, b) => a - b);

    return {
      goldenBalls,
      reasoning: parsed.reasoning || "AI 智能分析完成",
      hotAnalysis: parsed.hotAnalysis || "",
      coldAnalysis: parsed.coldAnalysis || "",
      trendAnalysis: parsed.trendAnalysis || "",
      tailResonance: hotTails,
      streakAnalysis: parsed.streakAnalysis || "",
      diagonalAnalysis: parsed.diagonalAnalysis || "",
      deadNumbers: parsed.deadNumbers || "",
      coreConclusion: parsed.coreConclusion || "",
      strategy: parsed.strategy || "",
      sampleCount: draws.length,
      usedLLM: true,
      parseErrors,
    };
  } catch (err) {
    // 回退到統計方法
    const hot3 = sortedFreq.slice(0, 2).map(x => x.num);
    const cold1 = sortedFreq.slice(-5)[Math.floor(Math.random() * 5)].num;
    const combined = [...hot3, cold1];
    const unique: number[] = [];
    for (const n of combined) { if (!unique.includes(n)) unique.push(n); }
    const goldenBalls = unique.slice(0, 3).sort((a, b) => a - b);

    return {
      goldenBalls,
      reasoning: `統計分析 ${draws.length} 期：熱號混合冷號策略（AI 分析失敗）`,
      hotAnalysis: `熱號 TOP8：${hot8}`,
      coldAnalysis: `冷號 BOTTOM8：${cold8}`,
      trendAnalysis: `近 5 期熱號：${recent5Hot}`,
      tailResonance: hotTails,
      streakAnalysis: `三連莊：${streakDisplay}；二連莊：${twoStreakDisplay}`,
      diagonalAnalysis: `斜連交會點：${diagonalDisplay}`,
      deadNumbers: `近5期死碼：${deadDisplay}`,
      coreConclusion: "AI 分析失敗，使用統計備用方案",
      strategy: "混合冷熱號碼策略",
      sampleCount: draws.length,
      usedLLM: false,
      parseErrors,
    };
  }
}
