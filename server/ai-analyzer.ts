/**
 * AI 演算服務 - 使用 Google API 數據 + LLM 分析
 * 分析各時段開獎數據，預測黃金球號碼
 */
import { invokeLLM } from "./_core/llm";
import { getLatestDraws, getDrawsByDate } from "./google-api";

// 時段配置
export const HOUR_SLOTS = [
  { source: "07", target: "08", label: "08時", copyRange: "0700~0755" },
  { source: "08", target: "09", label: "09時", copyRange: "0800~0855" },
  { source: "09", target: "10", label: "10時", copyRange: "0900~0955" },
  { source: "10", target: "11", label: "11時", copyRange: "1000~1055" },
  { source: "11", target: "12", label: "12時", copyRange: "1100~1155" },
  { source: "12", target: "13", label: "13時", copyRange: "1200~1255" },
  { source: "13", target: "14", label: "14時", copyRange: "1300~1355" },
  { source: "14", target: "15", label: "15時", copyRange: "1400~1455" },
  { source: "15", target: "16", label: "16時", copyRange: "1500~1555" },
  { source: "16", target: "17", label: "17時", copyRange: "1600~1655" },
  { source: "17", target: "18", label: "18時", copyRange: "1700~1755" },
  { source: "18", target: "19", label: "19時", copyRange: "1800~1855" },
  { source: "19", target: "20", label: "20時", copyRange: "1900~1955" },
  { source: "20", target: "21", label: "21時", copyRange: "2000~2055" },
  { source: "21", target: "22", label: "22時", copyRange: "2100~2155" },
];

/** 格式化開獎數據用於 AI 分析 */
function formatDrawsForAnalysis(
  draws: Array<{ period: string; time: string; numbers: number[] }>
): string {
  const lines = draws.map((d, i) => {
    const numsStr = d.numbers.map(n => String(n).padStart(2, "0")).join(" ");
    return `第${i + 1}期 ${d.time}: ${numsStr}`;
  });

  return lines.join("\n");
}

/** 使用 LLM 分析時段數據 */
export async function analyzeSlotWithLLM(
  dateStr: string,
  sourceHour: string,
  draws: Array<{ period: string; time: string; numbers: number[] }>
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
  const dataText = formatDrawsForAnalysis(draws);
  const copyRange = HOUR_SLOTS.find(s => s.source === sourceHour)?.copyRange || "";

  const prompt = `你是台灣賓果彩票分析專家。以下是台灣賓果 ${sourceHour}:00-${sourceHour}:55 時段最近 10 期的開獎數據（日期: ${dateStr}）：\n\n${dataText}\n\n請分析這些開獎數據的規律，推薦 3 顆最有可能在下一個時段出現的黃金球號碼（1-80之間的整數）。\n\n分析要點：\n1. 統計各號碼出現頻率（熱號代表高機率）\n2. 觀察近期趨勢（近期熱號更重要）\n3. 考慮冷號回補可能性（長期未出的號碼）\n4. 連莊號（相鄰期數出現的號碼）\n5. 斜連交會點（對角線相鄰的號碼）\n6. 區間平衡度（小號區與大號區的平衡）\n7. 整體策略（綜合上述分析給出最終推薦）\n\n請以 JSON 格式回應，提供詳細分析：`;

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
          hotAnalysis: { type: "string" },
          streakAnalysis: { type: "string" },
          diagonalAnalysis: { type: "string" },
          deadNumbers: { type: "string" },
          coldAnalysis: { type: "string" },
          trendAnalysis: { type: "string" },
          coreConclusion: { type: "string" },
          strategy: { type: "string" },
        },
        required: ["goldenBalls", "reasoning"],
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
    goldenBalls: parsed.goldenBalls || [],
    reasoning: parsed.reasoning || "",
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

/** 分析指定日期和時段 */
export async function analyzeSlot(
  dateStr: string,
  sourceHour: string
): Promise<{
  goldenBalls: number[];
  reasoning: string;
  [key: string]: any;
}> {
  try {
    // 從 Google API 獲取該時段的開獎數據
    const allDraws = await getDrawsByDate(dateStr);
    
    // 篩選該時段的數據
    const hourNum = parseInt(sourceHour, 10);
    const slotDraws = allDraws
      .filter((d: any) => {
        const hour = parseInt(d.time.split(":")[0], 10);
        return hour === hourNum;
      })
      .slice(0, 10) // 最近 10 期
      .map((d: any) => ({
        period: d.period,
        time: d.time,
        numbers: d.numbers,
      }));

    if (slotDraws.length === 0) {
      return {
        goldenBalls: [],
        reasoning: "該時段無開獎數據",
      };
    }

    // 使用 LLM 分析
    return await analyzeSlotWithLLM(dateStr, sourceHour, slotDraws);
  } catch (error) {
    console.error(`AI 分析失敗 (${dateStr} ${sourceHour}時):`, error);
    return {
      goldenBalls: [],
      reasoning: "分析失敗",
    };
  }
}

/** 批量分析所有時段 */
export async function analyzeAllSlots(dateStr: string): Promise<
  Record<string, {
    goldenBalls: number[];
    reasoning: string;
    [key: string]: any;
  }>
> {
  const results: Record<string, any> = {};

  for (const slot of HOUR_SLOTS) {
    try {
      results[slot.source] = await analyzeSlot(dateStr, slot.source);
    } catch (error) {
      console.error(`分析時段 ${slot.source} 失敗:`, error);
      results[slot.source] = {
        goldenBalls: [],
        reasoning: "分析失敗",
      };
    }
  }

  return results;
}
