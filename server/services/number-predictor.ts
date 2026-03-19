/**
 * 號碼預測服務
 * 提供多種策略分析近期開獎數據，推薦號碼
 */
import { getDb } from "../db";
import { drawRecords } from "../../drizzle/schema";
import { desc } from "drizzle-orm";

export type PredictStrategy =
  | "hot"       // 🔥 追熱策略
  | "cold"      // 🧊 補冷策略
  | "balanced"  // ⚖️ 均衡策略
  | "weighted"  // 🎲 加權隨機
  | "overdue"   // ⏳ 到期策略
  | "custom";   // 🎯 自選球號（前端直接用，不需後端計算）

export interface PredictResult {
  strategy: PredictStrategy;
  numbers: number[];
  reasoning: string;
  hotNumbers: number[];   // 熱號（前10）
  coldNumbers: number[];  // 冷號（後10）
  frequencyMap: Record<number, number>; // 每個號碼出現次數
  lastSeenMap: Record<number, number>;  // 每個號碼距今幾期未出現
  totalPeriods: number;
}

/** 取得近 N 期開獎數據並計算頻率 */
async function getRecentDrawsData(periods: number) {
  const db = await getDb();
  if (!db) return null;

  const records = await db
    .select()
    .from(drawRecords)
    .orderBy(desc(drawRecords.drawTime))
    .limit(periods);

  if (records.length === 0) return null;

  // 計算每個號碼的出現次數
  const frequencyMap: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) frequencyMap[i] = 0;

  for (const record of records) {
    const nums = record.numbers as number[];
    for (const n of nums) {
      if (n >= 1 && n <= 80) {
        frequencyMap[n] = (frequencyMap[n] || 0) + 1;
      }
    }
  }

  // 計算每個號碼距今幾期未出現
  const lastSeenMap: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) lastSeenMap[i] = periods; // 預設為最大期數

  for (let periodIdx = 0; periodIdx < records.length; periodIdx++) {
    const nums = records[periodIdx].numbers as number[];
    for (const n of nums) {
      if (lastSeenMap[n] === periods) {
        // 第一次找到，記錄距今幾期
        lastSeenMap[n] = periodIdx;
      }
    }
  }

  return { records, frequencyMap, lastSeenMap };
}

/** 執行號碼預測 */
export async function predictNumbers(
  strategy: PredictStrategy,
  periods: number,
  count: number,
  customNumbers?: number[]
): Promise<PredictResult> {
  // 自選球號直接返回
  if (strategy === "custom" && customNumbers && customNumbers.length > 0) {
    return {
      strategy: "custom",
      numbers: customNumbers.slice(0, count),
      reasoning: "您親自挑選的幸運號碼，相信直覺！",
      hotNumbers: [],
      coldNumbers: [],
      frequencyMap: {},
      lastSeenMap: {},
      totalPeriods: 0,
    };
  }

  const data = await getRecentDrawsData(Math.max(periods, 20));
  if (!data) {
    // 無數據時隨機選
    const nums = shuffleArray(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, count);
    return {
      strategy,
      numbers: nums.sort((a, b) => a - b),
      reasoning: "資料庫暫無數據，使用隨機選號。",
      hotNumbers: [],
      coldNumbers: [],
      frequencyMap: {},
      lastSeenMap: {},
      totalPeriods: 0,
    };
  }

  const { frequencyMap, lastSeenMap } = data;
  const actualPeriods = Math.min(periods, data.records.length);

  // 按頻率排序（高到低）
  const sortedByFreq = Object.entries(frequencyMap)
    .map(([n, freq]) => ({ n: parseInt(n), freq }))
    .sort((a, b) => b.freq - a.freq);

  // 熱號（出現最多的前10）
  const hotNumbers = sortedByFreq.slice(0, 10).map(x => x.n);
  // 冷號（出現最少的後10）
  const coldNumbers = sortedByFreq.slice(-10).map(x => x.n);

  // 按距今未出現期數排序（多到少）
  const sortedByOverdue = Object.entries(lastSeenMap)
    .map(([n, days]) => ({ n: parseInt(n), days }))
    .sort((a, b) => b.days - a.days);

  let numbers: number[] = [];
  let reasoning = "";

  switch (strategy) {
    case "hot": {
      // 追熱策略：從熱號中選取，加入少量隨機
      const hotPool = sortedByFreq.slice(0, 20).map(x => x.n);
      numbers = shuffleArray(hotPool).slice(0, count);
      reasoning = `近 ${actualPeriods} 期熱門號碼，${hotNumbers.slice(0, 5).map(n => String(n).padStart(2, "0")).join("、")} 出現最頻繁，跟隨熱門趨勢！`;
      break;
    }
    case "cold": {
      // 補冷策略：從冷號中選取
      const coldPool = sortedByFreq.slice(-20).map(x => x.n);
      numbers = shuffleArray(coldPool).slice(0, count);
      reasoning = `近 ${actualPeriods} 期冷門號碼，${coldNumbers.slice(0, 5).map(n => String(n).padStart(2, "0")).join("、")} 久未出現，補位理論！`;
      break;
    }
    case "balanced": {
      // 均衡策略：熱號冷號各半
      const hotPick = Math.ceil(count / 2);
      const coldPick = count - hotPick;
      const hotPool = shuffleArray(sortedByFreq.slice(0, 20).map(x => x.n)).slice(0, hotPick);
      const coldPool = shuffleArray(sortedByFreq.slice(-20).map(x => x.n)).slice(0, coldPick);
      numbers = [...hotPool, ...coldPool];
      reasoning = `熱號 ${hotPick} 顆 + 冷號 ${coldPick} 顆，均衡分散風險，提高覆蓋率！`;
      break;
    }
    case "weighted": {
      // 加權隨機：依頻率加權
      const pool: number[] = [];
      for (const [n, freq] of Object.entries(frequencyMap)) {
        const weight = Math.max(freq + 1, 1); // 最少權重1
        for (let i = 0; i < weight; i++) {
          pool.push(parseInt(n));
        }
      }
      const picked = new Set<number>();
      const shuffled = shuffleArray(pool);
      for (const n of shuffled) {
        if (!picked.has(n)) picked.add(n);
        if (picked.size >= count) break;
      }
      numbers = Array.from(picked);
      reasoning = `依近 ${actualPeriods} 期歷史頻率加權隨機選取，模擬機率分布，兼顧熱冷平衡！`;
      break;
    }
    case "overdue": {
      // 到期策略：選最久未出現的號碼
      const overduePool = sortedByOverdue.slice(0, 20).map(x => x.n);
      numbers = shuffleArray(overduePool).slice(0, count);
      const topOverdue = sortedByOverdue.slice(0, 5);
      reasoning = `${topOverdue.map(x => `${String(x.n).padStart(2, "0")}(${x.days}期未出)`).join("、")}，補漏理論！`;
      break;
    }
    default: {
      numbers = shuffleArray(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, count);
      reasoning = "隨機選號，祝您好運！";
    }
  }

  return {
    strategy,
    numbers: numbers.sort((a, b) => a - b),
    reasoning,
    hotNumbers,
    coldNumbers,
    frequencyMap,
    lastSeenMap,
    totalPeriods: actualPeriods,
  };
}

/** Fisher-Yates 洗牌 */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
