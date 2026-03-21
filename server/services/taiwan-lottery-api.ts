/**
 * 台灣彩券賓果賓果 API 爬蟲服務
 * 從官方 API 抓取開獎數據並備份到資料庫
 * API: https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db";

// ============ 台彩 API 數據格式 ============

interface BingoQueryResult {
  drawTerm: number;         // 期號
  bigShowOrder: string[];   // 排序後的號碼（大小排序）
  openShowOrder: string[];  // 開獎順序號碼
  bullEyeTop: string;       // 超級號碼（第一個開出的號碼）
  highLowTop: string;       // 大小結果（大/小）
  oddEvenTop: string;       // 單雙結果（單/雙）
}

interface TaiwanLotteryAPIResponse {
  rtCode: number;
  content: {
    bingoQueryResult: BingoQueryResult[];
    totalSize: number;
  };
}

// ============ 工具函數 ============

/**
 * 格式化日期為 YYYY-MM-DD 格式（台灣時間 UTC+8）
 */
export function getTaiwanDateStr(date: Date = new Date()): string {
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const taiwanDate = new Date(utcMs + taiwanOffset);
  
  const year = taiwanDate.getFullYear();
  const month = String(taiwanDate.getMonth() + 1).padStart(2, '0');
  const day = String(taiwanDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期為民國年份格式（用於顯示）
 * 輸入：YYYY-MM-DD + HH:MM，輸出：RRR/MM/DD HH:MM:00
 */
export function formatToROCDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const rocYear = parseInt(year) - 1911;
  return `${rocYear}/${month}/${day} ${timeStr}:00`;
}

/**
 * 根據每日期號索引計算開獎時間
 * 第一期 07:05，每 5 分鐘一期，共 204 期到 23:55
 */
export function calcDrawTime(index: number): string {
  const baseMinutes = 7 * 60 + 5; // 07:05
  const totalMinutes = baseMinutes + index * 5;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const mins = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

// ============ API 抓取 ============

/**
 * 從台彩 API 抓取指定日期的開獎數據
 * @param dateStr 日期字符串，格式 YYYY-MM-DD
 */
export async function fetchBingoDataFromAPI(dateStr: string): Promise<BingoQueryResult[]> {
  const allResults: BingoQueryResult[] = [];
  let pageNum = 1;
  const pageSize = 50;

  while (true) {
    const url = `https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult?openDate=${dateStr}&pageNum=${pageNum}&pageSize=${pageSize}`;
    try {
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.taiwanlottery.com.tw/',
          'Accept-Language': 'zh-TW,zh;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        console.error(`[TaiwanLottery] HTTP ${response.status} for ${dateStr} page ${pageNum}`);
        break;
      }
      
      const data = await response.json() as TaiwanLotteryAPIResponse;
      
      if (data?.rtCode !== 0 || !data?.content?.bingoQueryResult) {
        console.log(`[TaiwanLottery] No data for ${dateStr} page ${pageNum}, rtCode: ${data?.rtCode}`);
        break;
      }
      
      const results = data.content.bingoQueryResult;
      allResults.push(...results);
      
      if (allResults.length >= data.content.totalSize) break;
      pageNum++;
      
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[TaiwanLottery] Failed to fetch page ${pageNum} for ${dateStr}:`, err);
      break;
    }
  }
  
  return allResults;
}

// ============ 數據處理 ============

export interface ProcessedDraw {
  drawNumber: string;
  drawTime: string;   // 民國年份格式：115/03/15 07:05:00
  numbers: number[];
  superNumber: number;
  total: number;
  bigSmall: string;
  oddEven: string;
  plate: string;
}

/**
 * 驗證單筆開獎數據是否合法
 * - 期號必須是 9 位數字
 * - 號碼必須是 20 個，且每個在 1-80 之間
 */
export function validateDraw(res: BingoQueryResult): boolean {
  const termStr = String(res.drawTerm);
  if (termStr.length !== 9) {
    console.warn(`[Validate] Invalid drawTerm length: ${termStr} (expected 9 digits)`);
    return false;
  }
  const numbers = (res.bigShowOrder || []).map(Number);
  if (numbers.length !== 20) {
    console.warn(`[Validate] Invalid number count: ${numbers.length} (expected 20) for term ${termStr}`);
    return false;
  }
  if (numbers.some(n => n < 1 || n > 80 || !Number.isInteger(n))) {
    console.warn(`[Validate] Invalid number range for term ${termStr}`);
    return false;
  }
  return true;
}

/**
 * 處理 API 原始數據，轉換為應用格式
 * 使用期號差值計算開獎時間（避免 index 錯位問題）
 */
export function processRawData(rawData: BingoQueryResult[], dateStr: string): ProcessedDraw[] {
  // 過濾無效數據
  const valid = rawData.filter(validateDraw);
  const sorted = [...valid].sort((a, b) => a.drawTerm - b.drawTerm);
  
  if (sorted.length === 0) return [];
  
  // 取當天最小期號作為第 0 期（07:05）
  const minTerm = sorted[0].drawTerm;
  
  return sorted.map((res) => {
    const drawNumber = String(res.drawTerm);
    // 用期號差值計算時間：第 0 期 = 07:05，每期 +5 分鐘
    const indexFromMin = res.drawTerm - minTerm;
    const timeStr = calcDrawTime(indexFromMin);
    const drawTime = formatToROCDateTime(dateStr, timeStr);
    
    const numbers = (res.bigShowOrder || []).map(Number).sort((a, b) => a - b);
    const superNumber = Number(res.bullEyeTop) || (numbers[0] ?? 0);
    const total = numbers.reduce((sum, n) => sum + n, 0);
    
    // 棄查 API 返回的大小值，如果沒有則根據總和計算
    let bigSmall = '－';
    if (res.highLowTop && res.highLowTop.trim()) {
      if (res.highLowTop === '大') {
        bigSmall = 'big';
      } else if (res.highLowTop === '小') {
        bigSmall = 'small';
      }
    } else {
      // API 沒有返回大小值，根據總和計算：> 50 = 大，≤ 50 = 小
      bigSmall = total > 50 ? 'big' : 'small';
    }
    
    // 棄查 API 返回的單雙值，如果沒有則根據總和計算
    let oddEven = '－';
    if (res.oddEvenTop && res.oddEvenTop.trim()) {
      if (res.oddEvenTop === '單') {
        oddEven = 'odd';
      } else if (res.oddEvenTop === '雙') {
        oddEven = 'even';
      }
    } else {
      // API 沒有返回單雙值，根據總和計算：奇數 = 單，偶數 = 雙
      oddEven = total % 2 === 1 ? 'odd' : 'even';
    }
    
    return {
      drawNumber,
      drawTime,
      numbers,
      superNumber,
      total,
      bigSmall,
      oddEven,
      plate: 'A',
    };
  });
}

// ============ 資料庫操作 ============

/**
 * 批量 upsert 開獎數據到資料庫
 */
export async function batchUpsertDraws(draws: ProcessedDraw[]): Promise<number> {
  const db = await getDb();
  if (!db || draws.length === 0) return 0;
  
  // 最後防護：確保入庫的期號都是正確的 9 位數字
  const validDraws = draws.filter(d => /^\d{9}$/.test(d.drawNumber));
  const rejected = draws.length - validDraws.length;
  if (rejected > 0) {
    console.warn(`[TaiwanLottery] Rejected ${rejected} draws with invalid drawNumber format (must be 9 digits)`);
  }
  if (validDraws.length === 0) return 0;
  draws = validDraws;
  
  const BATCH_SIZE = 50;
  let totalInserted = 0;
  
  for (let i = 0; i < draws.length; i += BATCH_SIZE) {
    const batch = draws.slice(i, i + BATCH_SIZE);
    
    const valuePlaceholders: string[] = [];
    const params: unknown[] = [];
    
    for (const draw of batch) {
      valuePlaceholders.push(`(?, ?, ?, ?, ?, ?, ?, ?)`);
      params.push(
        draw.drawNumber,
        draw.drawTime,
        JSON.stringify(draw.numbers),
        draw.superNumber,
        draw.total,
        draw.bigSmall,
        draw.oddEven,
        draw.plate
      );
    }
    
    const query = `
      INSERT INTO draw_records (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate)
      VALUES ${valuePlaceholders.join(', ')}
      ON DUPLICATE KEY UPDATE
        drawTime = VALUES(drawTime),
        numbers = VALUES(numbers),
        superNumber = VALUES(superNumber),
        total = VALUES(total),
        bigSmall = VALUES(bigSmall),
        oddEven = VALUES(oddEven),
        plate = VALUES(plate)
    `;
    
    try {
      await db.execute(sql.raw(query.replace(/\?/g, () => {
        const val = params.shift();
        if (typeof val === 'number') return String(val);
        return `'${String(val).replace(/'/g, "''")}'`;
      })));
      totalInserted += batch.length;
    } catch (err) {
      console.error(`[TaiwanLottery] Batch upsert error at offset ${i}:`, err);
    }
  }
  
  return totalInserted;
}

/**
 * 同步指定日期的開獎數據
 */
export async function syncBingoDataForDate(dateStr: string): Promise<{ count: number; date: string }> {
  console.log(`[TaiwanLottery] Syncing data for ${dateStr}...`);
  
  const rawData = await fetchBingoDataFromAPI(dateStr);
  if (rawData.length === 0) {
    console.log(`[TaiwanLottery] No data found for ${dateStr}`);
    return { count: 0, date: dateStr };
  }
  
  const processed = processRawData(rawData, dateStr);
  const count = await batchUpsertDraws(processed);
  
  console.log(`[TaiwanLottery] Synced ${count} records for ${dateStr}`);
  return { count, date: dateStr };
}

/**
 * 同步最近 N 天的開獎數據（30 天備份）
 */
export async function syncRecentDays(days: number = 30): Promise<{ total: number; results: Array<{ date: string; count: number }> }> {
  const results: Array<{ date: string; count: number }> = [];
  let total = 0;
  
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getTaiwanDateStr(d);
    
    const result = await syncBingoDataForDate(dateStr);
    results.push(result);
    total += result.count;
    
    if (i < days - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return { total, results };
}

/**
 * 清除 30 天以前的舊數據
 * 保留最近 30 天的開獎記錄
 */
export async function purgeOldDraws(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // 計算 30 天前的民國年日期字串
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDateStr = getTaiwanDateStr(cutoff);
  const [y, m, d] = cutoffDateStr.split('-');
  const rocYear = parseInt(y) - 1911;
  const cutoffROC = `${rocYear}/${m}/${d}`;
  
  try {
    const result = await db.execute(
      sql.raw(`DELETE FROM draw_records WHERE drawTime < '${cutoffROC} 00:00:00'`)
    );
    const deleted = (result as unknown as { rowsAffected?: number }[])[0]?.rowsAffected ?? 0;
    if (deleted > 0) {
      console.log(`[TaiwanLottery] Purged ${deleted} records older than ${cutoffROC}`);
    }
    return deleted;
  } catch (err) {
    console.error('[TaiwanLottery] Failed to purge old draws:', err);
    return 0;
  }
}

/**
 * 同步今天的開獎數據，並清除 30 天以前舊數據
 */
export async function syncToday(): Promise<{ count: number; date: string }> {
  const dateStr = getTaiwanDateStr();
  const result = await syncBingoDataForDate(dateStr);
  // 每天同步時順便清除舊數據
  await purgeOldDraws();
  return result;
}
