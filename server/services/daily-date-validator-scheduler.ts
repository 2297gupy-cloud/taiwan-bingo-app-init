/**
 * 每日日期驗證調度器
 * 每天午夜 00:00 自動檢查 Google Sheets 同步的日期轉換邏輯
 */

import { dailyDateFormatCheck } from './google-sheets-date-validator';
import cron from 'node-cron';

let cronJobId: string | null = null;

/**
 * 啟動每日日期驗證任務
 * 每天 00:00 執行一次
 */
export function startDailyDateValidation(): void {
  if (cronJobId) {
    console.log('[DailyDateValidator] Scheduler already running');
    return;
  }

  console.log('[DailyDateValidator] Starting daily date validation scheduler');

  // 每天 00:00 執行
  const task = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[DailyDateValidator] Running daily date format check...');
      const result = await dailyDateFormatCheck();
      
      if (result.success) {
        console.log(`[DailyDateValidator] ✅ Check passed: ${result.message}`);
      } else {
        console.warn(`[DailyDateValidator] ⚠️ Check failed: ${result.message}`);
        if (result.errors.length > 0) {
          console.warn('[DailyDateValidator] Invalid records:');
          result.errors.forEach(err => {
            console.warn(`  - ${err.drawNumber}: ${err.actual} (expected: ${err.expected})`);
          });
        }
      }
    } catch (err) {
      console.error('[DailyDateValidator] Error during scheduled check:', err);
    }
  });

  cronJobId = task.toString();
  console.log('[DailyDateValidator] Daily date validation scheduler started (runs at 00:00 UTC)');
}

/**
 * 停止每日日期驗證任務
 */
export function stopDailyDateValidation(): void {
  if (cronJobId) {
    console.log('[DailyDateValidator] Stopping daily date validation scheduler');
    cronJobId = null;
  }
}

/**
 * 檢查調度器是否正在運行
 */
export function isDailyDateValidationRunning(): boolean {
  return cronJobId !== null;
}

/**
 * 手動執行一次日期驗證
 */
export async function runManualDateValidation(): Promise<any> {
  console.log('[DailyDateValidator] Running manual date validation...');
  const result = await dailyDateFormatCheck();
  console.log('[DailyDateValidator] Manual validation result:', result);
  return result;
}
