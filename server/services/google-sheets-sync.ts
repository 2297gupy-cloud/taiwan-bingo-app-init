/**
 * Google Sheets 自動同步服務
 * 定期從 Google Apps Script 拉取數據並更新數據庫
 * 支援今日同步（action=today）和歷史日期同步（action=date&date=YYYY-MM-DD）
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db";

// ============ 類型定義 ============

interface GoogleSheetsRow {
  period: string;           // 期別，例如 "115016038"
  date: string;             // ISO 日期字符串，例如 "2026-03-21"
  time: string;             // 時間，例如 "07:05"
  numbers: string[];        // 號碼數組
  superNum: string;         // 超級獎號碼文本，例如 "超級獎49"
  size: string;             // 大小，「大」、「小」、「－」
  oe: string;               // 單雙，「單」、「雙」、「－」
}

interface GoogleSheetsResponse {
  success: boolean;
  action: string;
  timestamp: string;
  data: GoogleSheetsRow[] | null;
  error: string | null;
}

export interface SyncedDraw {
  drawNumber: string;
  drawTime: string;         // 民國年份格式：115/03/15 07:05:00
  numbers: number[];
  superNumber: number;
  bigSmall: string;
  oddEven: string;
}

export interface SyncResult {
  success: boolean;
  count: number;
  message: string;
  date?: string;
}

// Google Apps Script URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwTn1ENAOBNtbxX9jQtayBJwiHtA72_1FCpLNYyxPDudU1IF4pJ13sRFd2DevSHe4rfmQ/exec';

// ============ 工具函數 ============

/**
 * 從「超級獎49」格式提取號碼
 */
function extractSuperNumber(superNumStr: string): number {
  const match = superNumStr.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * 將日期字符串（YYYY-MM-DD）和時間轉換為民國年份格式
 * 輸入：date="2026-03-21"，time="07:05"
 * 輸出："115/03/21 07:05:00"
 * 注意：直接解析日期字符串，避免時區問題
 */
function formatToROCDateTime(dateStr: string, timeStr: string): string {
  // 直接解析 YYYY-MM-DD 格式，避免 new Date() 的時區問題
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    // 嘗試用 new Date 解析（向後相容）
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const rocYear = year - 1911;
    return `${rocYear}/${month}/${day} ${timeStr}:00`;
  }
  const year = parseInt(parts[0]);
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  const rocYear = year - 1911;
  return `${rocYear}/${month}/${day} ${timeStr}:00`;
}

/**
 * 轉換大小值：「大」→ big，「小」→ small，其他 → 「－」
 */
function convertBigSmall(size: string): string {
  if (size === '大') return 'big';
  if (size === '小') return 'small';
  return '－';
}

/**
 * 轉換單雙值：「單」→ odd，「雙」→ even，其他 → 「－」
 */
function convertOddEven(oe: string): string {
  if (oe === '單') return 'odd';
  if (oe === '雙') return 'even';
  return '－';
}

// ============ API 調用 ============

/**
 * 從 Google Apps Script 拉取今日數據（action=today）
 */
export async function fetchFromGoogleSheets(): Promise<GoogleSheetsResponse> {
  return fetchFromGoogleSheetsByDate(null);
}

/**
 * 從 Google Apps Script 拉取指定日期數據
 * @param dateStr - YYYY-MM-DD 格式日期，null 表示今日
 */
export async function fetchFromGoogleSheetsByDate(dateStr: string | null): Promise<GoogleSheetsResponse> {
  let url: string;
  if (dateStr) {
    url = `${GAS_URL}?action=date&date=${dateStr}`;
  } else {
    url = `${GAS_URL}?action=today`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      console.error(`[GoogleSheets] HTTP ${response.status} for date=${dateStr || 'today'}`);
      return { success: false, action: 'error', timestamp: new Date().toISOString(), data: [], error: `HTTP ${response.status}` };
    }
    
    const data = await response.json() as GoogleSheetsResponse;
    return data;
  } catch (err) {
    console.error(`[GoogleSheets] Failed to fetch data for date=${dateStr || 'today'}:`, err);
    return { success: false, action: 'error', timestamp: new Date().toISOString(), data: [], error: String(err) };
  }
}

/**
 * 查詢 Google Apps Script 中有哪些可用日期（action=history）
 */
export async function fetchAvailableDates(): Promise<{ date: string; count: number; complete: boolean }[]> {
  const url = `${GAS_URL}?action=history`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json() as { success: boolean; data: { dates: { date: string; count: number; complete: boolean }[] } };
    if (!data.success || !data.data?.dates) return [];
    return data.data.dates;
  } catch (err) {
    console.error('[GoogleSheets] Failed to fetch available dates:', err);
    return [];
  }
}

// ============ 數據處理 ============

/**
 * 處理 Google Sheets 原始數據，轉換為應用格式
 */
export function processGoogleSheetsData(rows: GoogleSheetsRow[]): SyncedDraw[] {
  return rows.map(row => {
    const drawTime = formatToROCDateTime(row.date, row.time);
    const numbers = row.numbers.map(Number).sort((a, b) => a - b);
    const superNumber = extractSuperNumber(row.superNum);
    
    return {
      drawNumber: row.period,
      drawTime,
      numbers,
      superNumber,
      bigSmall: convertBigSmall(row.size),
      oddEven: convertOddEven(row.oe),
    };
  });
}

// ============ 數據庫操作 ============

/**
 * 批量 upsert 開獎數據到資料庫
 */
export async function batchUpsertDraws(draws: SyncedDraw[]): Promise<number> {
  const db = await getDb();
  if (!db || draws.length === 0) return 0;
  
  // 驗證期號格式（9位數字）
  const validDraws = draws.filter(d => /^\d{9}$/.test(d.drawNumber));
  const rejected = draws.length - validDraws.length;
  if (rejected > 0) {
    console.warn(`[GoogleSheets] Rejected ${rejected} draws with invalid drawNumber format`);
  }
  if (validDraws.length === 0) return 0;
  
  const BATCH_SIZE = 50;
  let totalInserted = 0;
  
  for (let i = 0; i < validDraws.length; i += BATCH_SIZE) {
    const batch = validDraws.slice(i, i + BATCH_SIZE);
    
    const valuePlaceholders: string[] = [];
    const params: unknown[] = [];
    
    for (const draw of batch) {
      valuePlaceholders.push(`(?, ?, ?, ?, ?, ?, ?, ?)`);
      params.push(
        draw.drawNumber,
        draw.drawTime,
        JSON.stringify(draw.numbers),
        draw.superNumber,
        draw.numbers.reduce((sum, n) => sum + n, 0), // total
        draw.bigSmall,
        draw.oddEven,
        'A' // plate
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
      console.error(`[GoogleSheets] Batch upsert error at offset ${i}:`, err);
    }
  }
  
  return totalInserted;
}

// ============ 同步邏輯 ============

/**
 * 同步今日 Google Sheets 數據到數據庫
 */
export async function syncGoogleSheetsData(): Promise<SyncResult> {
  return syncGoogleSheetsByDate(null);
}

/**
 * 同步指定日期的 Google Sheets 數據到數據庫
 * @param dateStr - YYYY-MM-DD 格式日期，null 表示今日
 */
export async function syncGoogleSheetsByDate(dateStr: string | null): Promise<SyncResult> {
  const label = dateStr || 'today';
  console.log(`[GoogleSheets] Starting sync for date=${label}...`);
  
  try {
    // 1. 從 Google Sheets 拉取數據
    const response = await fetchFromGoogleSheetsByDate(dateStr);
    
    if (!response.success || !response.data || response.data.length === 0) {
      const msg = response.error || 'No data from Google Sheets';
      console.log(`[GoogleSheets] No data received for date=${label}: ${msg}`);
      return { success: false, count: 0, message: msg, date: dateStr || undefined };
    }
    
    console.log(`[GoogleSheets] Received ${response.data.length} records for date=${label}`);
    
    // 2. 處理數據
    const processed = processGoogleSheetsData(response.data);
    
    // 3. 批量 upsert 到數據庫
    const count = await batchUpsertDraws(processed);
    
    console.log(`[GoogleSheets] Synced ${count} records for date=${label}`);
    return { success: true, count, message: `Synced ${count} records`, date: dateStr || undefined };
  } catch (err) {
    console.error(`[GoogleSheets] Sync failed for date=${label}:`, err);
    return { success: false, count: 0, message: `Sync failed: ${String(err)}`, date: dateStr || undefined };
  }
}

/**
 * 批量同步多個日期的歷史數據
 * @param dates - YYYY-MM-DD 格式日期陣列
 */
export async function syncMultipleDates(dates: string[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const dateStr of dates) {
    const result = await syncGoogleSheetsByDate(dateStr);
    results.push(result);
    // 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return results;
}

/**
 * 定期同步 Google Sheets 數據（用於定時任務）
 */
export async function startPeriodicSync(intervalMinutes: number = 5): Promise<void> {
  console.log(`[GoogleSheets] Starting periodic sync every ${intervalMinutes} minutes`);
  
  // 立即執行一次
  await syncGoogleSheetsData();
  
  // 定期執行
  setInterval(async () => {
    await syncGoogleSheetsData();
  }, intervalMinutes * 60 * 1000);
}
