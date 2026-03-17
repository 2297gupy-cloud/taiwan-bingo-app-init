/**
 * 台彩開獎數據完整同步服務
 * 支持批量下載和定時同步
 */

import { drawRecords } from '../../drizzle/schema';
import { getDb } from '../db';

const API_BASE_URL = 'https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult';

// 錨點數據：已知 115014819 = 2026-03-15 07:00
const ANCHOR_PERIOD = 115014819;
const ANCHOR_DATE = '2026-03-15';

interface BingoRecord {
  drawTerm: string;
  openDate: string;
  bigShowOrder: number[];
  bullEyeTop: number;
  highLowTop: string;
  oddEvenTop: string;
}

interface TransformedRecord {
  drawNumber: string;
  drawTime: string;
  numbers: number[];
  superNumber: number;
  bigSmall: string;
  oddEven: string;
}

/**
 * 由期別推算開獎時間
 */
function periodToTime(period: number): string {
  const diff = period - ANCHOR_PERIOD;
  const baseMinutes = 7 * 60; // 07:00
  const totalMinutes = baseMinutes + diff * 5;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/**
 * 從台彩 API 獲取指定日期的開獎數據
 */
async function fetchBingoDataFromAPI(dateStr: string, pageNum: number = 1): Promise<BingoRecord[]> {
  try {
    const url = `${API_BASE_URL}?openDate=${dateStr}&pageNum=${pageNum}&pageSize=50`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.taiwanlottery.com.tw/',
        'Accept': 'application/json',
      },
      timeout: 10000,
    } as any);

    if (!response.ok) {
      console.log(`[TaiwanLotterySync] HTTP ${response.status} for ${dateStr}`);
      return [];
    }

    const data = await response.json() as any;

    if (data.code !== '0000' || !data.content?.bingoQueryResult) {
      console.log(`[TaiwanLotterySync] No data for ${dateStr} (code: ${data.code})`);
      return [];
    }

    return data.content.bingoQueryResult;
  } catch (error) {
    console.error(`[TaiwanLotterySync] Error fetching ${dateStr}:`, error);
    return [];
  }
}

/**
 * 轉換台彩 API 數據為數據庫格式
 */
function transformRecord(record: BingoRecord, dateStr: string): TransformedRecord {
  const openDate = record.openDate || '';
  const timePart = openDate.split(' ')[1] || '00:00:00';

  return {
    drawNumber: record.drawTerm || '',
    drawTime: `${dateStr} ${timePart}`,
    numbers: Array.isArray(record.bigShowOrder) ? record.bigShowOrder : [],
    superNumber: record.bullEyeTop || 0,
    bigSmall: record.highLowTop || 'unknown',
    oddEven: record.oddEvenTop || 'unknown',
  };
}

/**
 * 批量下載指定日期的所有開獎數據
 */
export async function downloadBingoDataForDate(dateStr: string): Promise<TransformedRecord[]> {
  console.log(`[TaiwanLotterySync] Downloading data for ${dateStr}...`);

  const allRecords: TransformedRecord[] = [];
  const pageSize = 50;
  const maxPages = 5; // 204期 / 50 = 5頁

  for (let page = 1; page <= maxPages; page++) {
    const records = await fetchBingoDataFromAPI(dateStr, page);

    if (!records || records.length === 0) {
      break;
    }

    const transformed = records.map(r => transformRecord(r, dateStr));
    allRecords.push(...transformed);

    if (records.length < pageSize) {
      break;
    }

    // 延遲 500ms 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[TaiwanLotterySync] Downloaded ${allRecords.length} records for ${dateStr}`);
  return allRecords;
}

/**
 * 批量下載 30 天歷史數據
 */
export async function downloadLast30Days(): Promise<TransformedRecord[]> {
  console.log('[TaiwanLotterySync] Starting 30-day download...');

  const allRecords: TransformedRecord[] = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const year = date.getFullYear() - 1911;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const rocDate = `${year}-${month}-${day}`;

    const records = await downloadBingoDataForDate(rocDate);
    allRecords.push(...records);

    // 延遲 1 秒避免請求過快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[TaiwanLotterySync] Downloaded total ${allRecords.length} records for last 30 days`);
  return allRecords;
}

/**
 * 將數據保存到數據庫
 */
export async function saveBingoDataToDatabase(records: TransformedRecord[]): Promise<number> {
  if (!records || records.length === 0) {
    return 0;
  }

  try {
    const database = await getDb();
    if (!database) {
      console.error('[TaiwanLotterySync] Database connection failed');
      return 0;
    }

    // 批量插入（每批 100 條）
    let savedCount = 0;
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);

      await database.insert(drawRecords).values(
        batch.map(r => ({
          drawNumber: r.drawNumber,
          drawTime: r.drawTime,
          numbers: r.numbers,
          superNumber: r.superNumber,
          bigSmall: r.bigSmall,
          oddEven: r.oddEven,
          plate: '0',
          total: 0,
          createdAt: new Date() as any,
        }))
      );

      savedCount += batch.length;
      console.log(`[TaiwanLotterySync] Saved ${savedCount}/${records.length} records`);
    }

    return savedCount;
  } catch (error) {
    console.error('[TaiwanLotterySync] Error saving to database:', error);
    return 0;
  }
}

/**
 * 完整的同步流程：下載 + 轉換 + 保存
 */
export async function syncBingoDataForDate(dateStr: string): Promise<{ success: boolean; count: number }> {
  try {
    const records = await downloadBingoDataForDate(dateStr);
    const savedCount = await saveBingoDataToDatabase(records);

    return {
      success: true,
      count: savedCount,
    };
  } catch (error) {
    console.error(`[TaiwanLotterySync] Error syncing ${dateStr}:`, error);
    return {
      success: false,
      count: 0,
    };
  }
}

/**
 * 批量同步 30 天數據
 */
export async function syncLast30Days(): Promise<{ success: boolean; totalCount: number }> {
  try {
    const records = await downloadLast30Days();
    const savedCount = await saveBingoDataToDatabase(records);

    // 統計 21 時和 22 時的記錄
    const hour21 = records.filter(r => r.drawTime.includes(' 21:'));
    const hour22 = records.filter(r => r.drawTime.includes(' 22:'));

    console.log(`[TaiwanLotterySync] Sync complete: ${savedCount} records saved`);
    console.log(`[TaiwanLotterySync] 21時: ${hour21.length} records, 22時: ${hour22.length} records`);

    return {
      success: true,
      totalCount: savedCount,
    };
  } catch (error) {
    console.error('[TaiwanLotterySync] Error syncing last 30 days:', error);
    return {
      success: false,
      totalCount: 0,
    };
  }
}
