/**
 * Google Sheets 定期同步調度器
 * 在服務器啟動時開始定期同步任務
 */

import { syncGoogleSheetsData } from './google-sheets-sync';

let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * 啟動定期同步任務
 * @param intervalMinutes 同步間隔（分鐘），默認 30 分鐘
 */
export function startGoogleSheetsSync(intervalMinutes: number = 30): void {
  if (syncIntervalId) {
    console.log('[GoogleSheetsScheduler] Sync already running');
    return;
  }

  console.log(`[GoogleSheetsScheduler] Starting periodic sync every ${intervalMinutes} minutes`);

  // 立即執行一次
  syncGoogleSheetsData().then(result => {
    console.log(`[GoogleSheetsScheduler] Initial sync result:`, result);
  }).catch(err => {
    console.error('[GoogleSheetsScheduler] Initial sync failed:', err);
  });

  // 定期執行
  syncIntervalId = setInterval(async () => {
    try {
      const result = await syncGoogleSheetsData();
      console.log(`[GoogleSheetsScheduler] Periodic sync result:`, result);
    } catch (err) {
      console.error('[GoogleSheetsScheduler] Periodic sync failed:', err);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * 停止定期同步任務
 */
export function stopGoogleSheetsSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[GoogleSheetsScheduler] Sync stopped');
  }
}

/**
 * 檢查同步是否正在運行
 */
export function isGoogleSheetsSyncRunning(): boolean {
  return syncIntervalId !== null;
}
