/**
 * AI 智能預測分析服務
 * 基於歷史數據統計分析，生成預測結果
 * 參考 jyb.one/bingo 的 AI 預測功能設計
 */

import { getDb } from "../db";
import { drawRecords } from "../../drizzle/schema";
import { desc, sql } from "drizzle-orm";

// ============ 類型定義 ============

export interface PredictionIndicator {
  label: string;       // 指標名稱
  icon: string;        // 圖標
  prediction: string;  // 預測結果（如「大」「小」「單」「雙」「上盤」「下盤」「奇盤」「偶盤」）
  confidence: number;  // 信心值 0-100
  trend: string;       // 趨勢描述（「觀望」「強烈」「偏向」）
}

export interface AIPredictionResult {
  drawNumber: string;           // 預測期號
  sampleCount: number;          // 樣本數
  totalSampleCount: number;     // 總庫樣本數
  todayDrawIndex: number;       // 今天已開第幾期
  totalDailyDraws: number;      // 每天總期數

  // 本期焦點
  recommendedNumbers: number[]; // 推薦號碼（5個）
  overallConfidence: number;    // 整體信心值
  aiSuggestion: string;         // AI 建議文字

  // 六個預測指標
  indicators: PredictionIndicator[];

  // 上一期預測
  lastPrediction?: {
    drawNumber: string;
    numbers: number[];
    createdAt: string;
  };

  // 統計數據
  stats: {
    bigPercent: number;
    smallPercent: number;
    oddPercent: number;
    evenPercent: number;
    recentTotals: Array<{ drawNumber: string; total: number }>;
    hotNumbers: Array<{ number: number; count: number }>;
    streak: { type: string; count: number };
  };
}

// ============ 工具函數 ============

/** 計算信心值（基於樣本量和趨勢強度） */
function calcConfidence(ratio: number, sampleCount: number): number {
  // 比例越偏離 50% 信心越高，樣本越多信心越高
  const deviation = Math.abs(ratio - 0.5);
  const sampleFactor = Math.min(sampleCount / 100, 1);
  const base = 50 + deviation * 60 * sampleFactor;
  // 加入隨機擾動 ±3%
  const noise = (Math.random() - 0.5) * 6;
  return Math.round(Math.min(Math.max(base + noise, 45), 75));
}

/** 判斷趨勢描述 */
function getTrend(confidence: number): string {
  if (confidence >= 65) return '偏向';
  if (confidence >= 58) return '觀望';
  return '觀望';
}

/** 計算連續走勢 */
function calcStreak(records: Array<{ bigSmall: string }>): { type: string; count: number } {
  if (records.length === 0) return { type: 'big', count: 0 };
  const first = records[0].bigSmall;
  let count = 0;
  for (const r of records) {
    if (r.bigSmall === first) count++;
    else break;
  }
  return { type: first, count };
}

/** 生成 AI 建議文字 */
function generateAISuggestion(
  sampleCount: number,
  bigPercent: number,
  oddPercent: number,
  superBigPercent: number,
  plateDesc: string,
  recommendedNumbers: number[]
): string {
  const totalBig = bigPercent > 55 ? '偏大' : bigPercent < 45 ? '偏小' : '均衡';
  const superHeat = superBigPercent > 55 ? '大數熱度較高' : '小數熱度較高';
  const plateEnergy = plateDesc === '上盤' ? '上盤能量正在聚集' : plateDesc === '下盤' ? '下盤能量正在聚集' : '中盤走勢平穩';
  const numsStr = recommendedNumbers.join(' ');
  
  return `根據近${sampleCount}期大數據運算，總和${totalBig}，超級獎號${superHeat}。AI 智能模型交叉比對當天與歷史樣本，${plateEnergy}。綜合指標建議：重點關注超級小與${plateDesc}走勢。推薦號碼：${numsStr}`;
}

/** 選取推薦號碼（熱號+冷號混合策略） */
function selectRecommendedNumbers(
  hotNumbers: Array<{ number: number; count: number }>,
  coldNumbers: Array<{ number: number; count: number }>,
  count: number = 5
): number[] {
  const selected = new Set<number>();
  
  // 取 3 個熱號
  for (const h of hotNumbers.slice(0, 6)) {
    if (selected.size >= 3) break;
    selected.add(h.number);
  }
  
  // 取 2 個冷號
  for (const c of coldNumbers.slice(0, 6)) {
    if (selected.size >= count) break;
    selected.add(c.number);
  }
  
  // 補足到 count 個
  while (selected.size < count) {
    const n = Math.floor(Math.random() * 80) + 1;
    selected.add(n);
  }
  
  return Array.from(selected).sort((a, b) => a - b);
}

// ============ 主要預測函數 ============

/**
 * 生成 AI 預測分析
 * @param targetDrawNumber 目標期號（預測哪一期）
 * @param samplePeriods 分析樣本數（近 N 期）
 */
export async function generateAIPrediction(
  targetDrawNumber: string,
  samplePeriods: number = 30
): Promise<AIPredictionResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 取近 N 期歷史數據
  const records = await db.select().from(drawRecords)
    .orderBy(desc(drawRecords.drawNumber))
    .limit(samplePeriods);

  if (records.length < 5) return null;

  const totalCount = await db.select({ count: sql<number>`COUNT(*)` }).from(drawRecords);
  const totalSampleCount = Number(totalCount[0]?.count) || records.length;

  // ---- 統計計算 ----
  const bigCount = records.filter(r => r.bigSmall === 'big').length;
  const smallCount = records.length - bigCount;
  const oddCount = records.filter(r => r.oddEven === 'odd').length;
  const evenCount = records.length - oddCount;
  
  const bigPercent = Math.round((bigCount / records.length) * 100);
  const oddPercent = Math.round((oddCount / records.length) * 100);

  // 超級號大小統計
  const superBigCount = records.filter(r => (r.superNumber as number) > 40).length;
  const superBigPercent = Math.round((superBigCount / records.length) * 100);
  const superOddCount = records.filter(r => (r.superNumber as number) % 2 !== 0).length;
  const superOddPercent = Math.round((superOddCount / records.length) * 100);

  // 盤面統計
  const upperCount = records.filter(r => r.plate === 'upper' || r.plate === '上').length;
  const lowerCount = records.filter(r => r.plate === 'lower' || r.plate === '下').length;
  const maxPlateCount = Math.max(upperCount, lowerCount, records.length - upperCount - lowerCount);
  let plateDesc = '中盤';
  if (upperCount === maxPlateCount) plateDesc = '上盤';
  else if (lowerCount === maxPlateCount) plateDesc = '下盤';

  // 奇偶盤（總和奇偶）
  const oddBoardCount = records.filter(r => (r.total as number) % 2 !== 0).length;
  const oddBoardPercent = Math.round((oddBoardCount / records.length) * 100);

  // 號碼頻率
  const numberFreq: Record<number, number> = {};
  for (const record of records) {
    const nums = record.numbers as number[];
    for (const n of nums) {
      numberFreq[n] = (numberFreq[n] || 0) + 1;
    }
  }
  const sortedByFreq = Object.entries(numberFreq)
    .map(([n, c]) => ({ number: parseInt(n), count: c }))
    .sort((a, b) => b.count - a.count);
  
  const hotNumbers = sortedByFreq.slice(0, 10);
  const coldNumbers = sortedByFreq.slice(-10).reverse();

  // 總和走勢
  const recentTotals = records.slice(0, 20).map(r => ({
    drawNumber: r.drawNumber,
    total: r.total as number,
  })).reverse();

  // 連續走勢
  const streak = calcStreak(records as Array<{ bigSmall: string }>);

  // ---- 預測指標 ----
  const bigConf = calcConfidence(bigCount / records.length, records.length);
  const oddConf = calcConfidence(oddCount / records.length, records.length);
  const superBigConf = calcConfidence(superBigCount / records.length, records.length);
  const superOddConf = calcConfidence(superOddCount / records.length, records.length);
  const plateConf = calcConfidence(maxPlateCount / records.length, records.length);
  const oddBoardConf = calcConfidence(oddBoardCount / records.length, records.length);

  const indicators: PredictionIndicator[] = [
    {
      label: '總和大小',
      icon: '📊',
      prediction: bigPercent >= 50 ? '大' : '小',
      confidence: bigConf,
      trend: getTrend(bigConf),
    },
    {
      label: '總和單雙',
      icon: '⚖️',
      prediction: oddPercent >= 50 ? '單' : '雙',
      confidence: oddConf,
      trend: getTrend(oddConf),
    },
    {
      label: '超級大小',
      icon: '🔥',
      prediction: superBigPercent >= 50 ? '大' : '小',
      confidence: superBigConf,
      trend: getTrend(superBigConf),
    },
    {
      label: '超級單雙',
      icon: '🧲',
      prediction: superOddPercent >= 50 ? '單' : '雙',
      confidence: superOddConf,
      trend: getTrend(superOddConf),
    },
    {
      label: '盤面分布',
      icon: '🧱',
      prediction: plateDesc,
      confidence: plateConf,
      trend: getTrend(plateConf),
    },
    {
      label: '奇偶盤',
      icon: '🎯',
      prediction: oddBoardPercent >= 50 ? '奇盤' : '偶盤',
      confidence: oddBoardConf,
      trend: getTrend(oddBoardConf),
    },
  ];

  // ---- 推薦號碼 ----
  const recommendedNumbers = selectRecommendedNumbers(hotNumbers, coldNumbers, 5);
  const overallConfidence = Math.round(
    indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length
  );

  // ---- AI 建議文字 ----
  const aiSuggestion = generateAISuggestion(
    records.length,
    bigPercent,
    oddPercent,
    superBigPercent,
    plateDesc,
    recommendedNumbers
  );

  // ---- 今天開獎進度 ----
  const now = new Date();
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const taiwanNow = new Date(utcMs + taiwanOffset);
  const currentMinutes = taiwanNow.getHours() * 60 + taiwanNow.getMinutes();
  const baseMinutes = 7 * 60 + 5;
  const todayDrawIndex = Math.max(0, Math.floor((currentMinutes - baseMinutes) / 5) + 1);

  return {
    drawNumber: targetDrawNumber,
    sampleCount: records.length,
    totalSampleCount,
    todayDrawIndex: Math.min(todayDrawIndex, 204),
    totalDailyDraws: 204,
    recommendedNumbers,
    overallConfidence,
    aiSuggestion,
    indicators,
    stats: {
      bigPercent,
      smallPercent: 100 - bigPercent,
      oddPercent,
      evenPercent: 100 - oddPercent,
      recentTotals,
      hotNumbers: hotNumbers.slice(0, 10),
      streak,
    },
  };
}

/**
 * 儲存 AI 預測結果到資料庫
 */
export async function saveAIPrediction(
  drawNumber: string,
  prediction: AIPredictionResult
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql.raw(`
      INSERT INTO ai_predictions (drawNumber, predictedNumbers, confidence, analysis, createdAt)
      VALUES ('${drawNumber}', '${JSON.stringify(prediction.recommendedNumbers)}', ${prediction.overallConfidence}, '${prediction.aiSuggestion.replace(/'/g, "''")}', NOW())
      ON DUPLICATE KEY UPDATE
        predictedNumbers = VALUES(predictedNumbers),
        confidence = VALUES(confidence),
        analysis = VALUES(analysis)
    `));
  } catch (err) {
    console.error('[AIPredictor] Failed to save prediction:', err);
  }
}
