/**
 * 即時開獎模擬器
 * 根據台灣彩券賓果賓果的開獎時間表模擬即時開獎
 * 每天 204 期，從 07:05 到 23:55，每 5 分鐘一期
 * 
 * 當無法連接台彩 API 時，使用模擬數據保持應用正常運作
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getTaiwanDateStr, formatToROCDateTime, calcDrawTime, syncToday } from "./taiwan-lottery-api";

// ============ 開獎時間表 ============

/**
 * 取得今天所有開獎時間（台灣時間）
 * 07:05, 07:10, 07:15, ..., 23:55 共 204 期
 */
export function getTodayDrawSchedule(): Array<{ index: number; time: string; hour: number; minute: number }> {
  const schedule = [];
  for (let i = 0; i < 204; i++) {
    const baseMinutes = 7 * 60 + 5;
    const totalMinutes = baseMinutes + i * 5;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    schedule.push({ index: i, time, hour, minute });
  }
  return schedule;
}

/**
 * 取得當前台灣時間
 */
export function getTaiwanNow(): Date {
  const now = new Date();
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + taiwanOffset);
}

/**
 * 取得當前應該顯示的期號索引（今天第幾期）
 * 返回 -1 表示今天開獎尚未開始（07:05 前）
 */
export function getCurrentDrawIndex(): number {
  const now = getTaiwanNow();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  
  const baseMinutes = 7 * 60 + 5; // 07:05
  if (currentMinutes < baseMinutes) return -1;
  
  const lastMinutes = 23 * 60 + 55; // 23:55
  if (currentMinutes > lastMinutes) return 203; // 最後一期
  
  return Math.floor((currentMinutes - baseMinutes) / 5);
}

// ============ 模擬數據生成 ============

/**
 * 生成隨機開獎號碼（1-80 中選 20 個）
 */
function generateRandomNumbers(): number[] {
  const pool = Array.from({ length: 80 }, (_, i) => i + 1);
  const selected: number[] = [];
  
  for (let i = 0; i < 20; i++) {
    const idx = Math.floor(Math.random() * (pool.length - i)) + i;
    [pool[i], pool[idx]] = [pool[idx], pool[i]];
    selected.push(pool[i]);
  }
  
  return selected.sort((a, b) => a - b);
}

/**
 * 計算統計信息
 */
function calcStats(numbers: number[]): { total: number; bigSmall: string; oddEven: string; superNumber: number } {
  const total = numbers.reduce((sum, n) => sum + n, 0);
  const bigSmall = total > 810 ? 'big' : 'small';
  const oddEven = total % 2 === 0 ? 'even' : 'odd';
  const superNumber = numbers[Math.floor(Math.random() * numbers.length)];
  return { total, bigSmall, oddEven, superNumber };
}

/**
 * 生成模擬開獎數據並保存到資料庫
 * @param drawNumber 期號
 * @param drawTime 開獎時間（民國年份格式）
 */
export async function generateAndSaveSimulatedDraw(drawNumber: string, drawTime: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const numbers = generateRandomNumbers();
  const { total, bigSmall, oddEven, superNumber } = calcStats(numbers);
  
  try {
    const query = `
      INSERT INTO draw_records (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate)
      VALUES ('${drawNumber}', '${drawTime}', '${JSON.stringify(numbers)}', ${superNumber}, ${total}, '${bigSmall}', '${oddEven}', 'A')
      ON DUPLICATE KEY UPDATE
        drawTime = VALUES(drawTime),
        numbers = VALUES(numbers),
        superNumber = VALUES(superNumber),
        total = VALUES(total),
        bigSmall = VALUES(bigSmall),
        oddEven = VALUES(oddEven)
    `;
    await db.execute(sql.raw(query));
    console.log(`[LiveDrawSimulator] Generated draw ${drawNumber} at ${drawTime}`);
    return true;
  } catch (err) {
    console.error(`[LiveDrawSimulator] Failed to save draw ${drawNumber}:`, err);
    return false;
  }
}

// ============ 即時開獎輪詢器 ============

let pollingInterval: NodeJS.Timeout | null = null;
let lastGeneratedDrawNumber: string | null = null;
let useRealAPI = true; // 優先嘗試真實 API

/**
 * 根據當前時間計算應該生成的期號
 * 期號格式：YYMMDDIIII（民國年份 + 日期 + 序號）
 * 例如：115031500001 表示 115 年 03 月 15 日第 1 期
 */
function calcCurrentDrawNumber(): string | null {
  const now = getTaiwanNow();
  const index = getCurrentDrawIndex();
  if (index < 0) return null;
  
  const year = now.getFullYear() - 1911; // 民國年份
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(index + 1).padStart(3, '0');
  
  return `${year}${month}${day}${seq}`;
}

/**
 * 嘗試從台彩 API 同步今天數據，失敗則使用模擬
 */
async function tryRealAPIOrSimulate(): Promise<void> {
  const now = getTaiwanNow();
  const index = getCurrentDrawIndex();
  if (index < 0) return; // 今天開獎尚未開始
  
  const dateStr = getTaiwanDateStr(now);
  const drawNumber = calcCurrentDrawNumber();
  if (!drawNumber) return;
  
  // 避免重複生成
  if (drawNumber === lastGeneratedDrawNumber) return;
  
  if (useRealAPI) {
    try {
      console.log(`[LiveDrawSimulator] Trying real API for ${dateStr}...`);
      const result = await syncToday();
      if (result.count > 0) {
        console.log(`[LiveDrawSimulator] Real API synced ${result.count} records`);
        lastGeneratedDrawNumber = drawNumber;
        return;
      }
      // API 返回 0 筆，切換到模擬模式
      console.log(`[LiveDrawSimulator] Real API returned 0 records, switching to simulation`);
      useRealAPI = false;
    } catch (err) {
      console.log(`[LiveDrawSimulator] Real API failed, switching to simulation:`, err);
      useRealAPI = false;
    }
  }
  
  // 使用模擬數據
  const timeStr = calcDrawTime(index);
  const drawTime = formatToROCDateTime(dateStr, timeStr);
  const success = await generateAndSaveSimulatedDraw(drawNumber, drawTime);
  if (success) {
    lastGeneratedDrawNumber = drawNumber;
  }
}

/**
 * 啟動即時開獎輪詢
 * 每 20 秒檢查一次是否有新期開獎
 */
export function startLiveDrawPolling(intervalSeconds: number = 20): void {
  if (pollingInterval) {
    console.log('[LiveDrawSimulator] Polling already running');
    return;
  }
  
  console.log(`[LiveDrawSimulator] Starting live draw polling every ${intervalSeconds}s`);
  
  // 立即執行一次
  tryRealAPIOrSimulate().catch(err => console.error('[LiveDrawSimulator] Initial poll error:', err));
  
  pollingInterval = setInterval(async () => {
    try {
      await tryRealAPIOrSimulate();
    } catch (err) {
      console.error('[LiveDrawSimulator] Polling error:', err);
    }
  }, intervalSeconds * 1000);
}

/**
 * 停止即時開獎輪詢
 */
export function stopLiveDrawPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[LiveDrawSimulator] Polling stopped');
  }
}

/**
 * 重置 API 模式（允許重新嘗試真實 API）
 */
export function resetAPIMode(): void {
  useRealAPI = true;
  lastGeneratedDrawNumber = null;
  console.log('[LiveDrawSimulator] API mode reset, will retry real API');
}
