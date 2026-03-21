/**
 * Google Sheets 日期轉換驗證服務
 * 每日自動檢查日期轉換邏輯是否正確
 */

import { getDb } from '../db';
import { drawRecords } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 將 ISO 日期轉換為民國年份格式
 * @param isoDate ISO 格式日期字符串 (e.g., "2026-03-20T16:00:00.000Z")
 * @param time 時間字符串 (e.g., "07:05")
 * @returns 民國年份格式 (e.g., "115/03/20 07:05:00")
 */
export function convertToROCFormat(isoDate: string, time: string): string {
  try {
    const date = new Date(isoDate);
    const year = date.getFullYear() - 1911; // 轉換為民國年份
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const [hours, minutes] = time.split(':');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:00`;
  } catch (err) {
    console.error('[DateValidator] Error converting date:', err);
    throw err;
  }
}

/**
 * 驗證數據庫中的日期格式是否正確
 * @param drawNumber 期號
 * @param expectedDate 期望的民國年份格式日期
 * @returns 驗證結果
 */
export async function validateDrawDate(drawNumber: string, expectedDate: string): Promise<{
  valid: boolean;
  drawNumber: string;
  expected: string;
  actual: string | null;
  message: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        valid: false,
        drawNumber,
        expected: expectedDate,
        actual: null,
        message: 'Database connection failed',
      };
    }

    const rows = await db
      .select({ drawTime: drawRecords.drawTime })
      .from(drawRecords)
      .where(eq(drawRecords.drawNumber, drawNumber))
      .limit(1);

    if (rows.length === 0) {
      return {
        valid: false,
        drawNumber,
        expected: expectedDate,
        actual: null,
        message: `Record not found for draw number ${drawNumber}`,
      };
    }

    const actual = rows[0].drawTime;
    const valid = actual === expectedDate;

    return {
      valid,
      drawNumber,
      expected: expectedDate,
      actual,
      message: valid ? 'Date format is correct' : 'Date format mismatch',
    };
  } catch (err) {
    console.error('[DateValidator] Error validating date:', err);
    return {
      valid: false,
      drawNumber,
      expected: expectedDate,
      actual: null,
      message: `Validation error: ${String(err)}`,
    };
  }
}

/**
 * 每日檢查所有記錄的日期格式
 * @returns 檢查結果摘要
 */
export async function dailyDateFormatCheck(): Promise<{
  success: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: Array<{
    drawNumber: string;
    expected: string;
    actual: string | null;
  }>;
  message: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        errors: [],
        message: 'Database connection failed',
      };
    }

    // 獲取最近 50 條記錄進行檢查
    const allRecords = await db
      .select({
        drawNumber: drawRecords.drawNumber,
        drawTime: drawRecords.drawTime,
      })
      .from(drawRecords)
      .limit(50);

    let validRecords = 0;
    let invalidRecords = 0;
    const errors: Array<{ drawNumber: string; expected: string; actual: string | null }> = [];

    for (const record of allRecords) {
      // 檢查日期格式是否為 "XXX/XX/XX XX:XX:XX"
      const dateRegex = /^\d{3}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
      if (dateRegex.test(record.drawTime)) {
        validRecords++;
      } else {
        invalidRecords++;
        errors.push({
          drawNumber: record.drawNumber,
          expected: '格式: XXX/XX/XX XX:XX:XX',
          actual: record.drawTime,
        });
      }
    }

    const success = invalidRecords === 0;

    console.log(`[DateValidator] Daily check completed: ${validRecords}/${allRecords.length} records valid`);

    return {
      success,
      totalRecords: allRecords.length,
      validRecords,
      invalidRecords,
      errors,
      message: success
        ? `All ${allRecords.length} records have correct date format`
        : `Found ${invalidRecords} records with invalid date format`,
    };
  } catch (err) {
    console.error('[DateValidator] Error during daily check:', err);
    return {
      success: false,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: [],
      message: `Daily check failed: ${String(err)}`,
    };
  }
}

/**
 * 修復日期格式錯誤的記錄
 * @param drawNumber 期號
 * @param correctDate 正確的民國年份格式日期
 * @returns 修復結果
 */
export async function fixDrawDate(drawNumber: string, correctDate: string): Promise<{
  success: boolean;
  drawNumber: string;
  newDate: string;
  message: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        drawNumber,
        newDate: correctDate,
        message: 'Database connection failed',
      };
    }

    await db
      .update(drawRecords)
      .set({ drawTime: correctDate })
      .where(eq(drawRecords.drawNumber, drawNumber));

    console.log(`[DateValidator] Fixed date for draw ${drawNumber}: ${correctDate}`);

    return {
      success: true,
      drawNumber,
      newDate: correctDate,
      message: `Date fixed successfully`,
    };
  } catch (err) {
    console.error('[DateValidator] Error fixing date:', err);
    return {
      success: false,
      drawNumber,
      newDate: correctDate,
      message: `Fix failed: ${String(err)}`,
    };
  }
}
