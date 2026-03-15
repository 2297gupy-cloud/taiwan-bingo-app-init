/**
 * 手動同步今天的台彩數據
 * 使用修正後的期號計算邏輯
 */
import { syncBingoDataForDate, purgeOldDraws, getTaiwanDateStr } from './server/services/taiwan-lottery-api.ts';

const dateStr = getTaiwanDateStr();
console.log(`Syncing data for ${dateStr}...`);

const result = await syncBingoDataForDate(dateStr);
console.log(`Synced: ${result.count} records for ${result.date}`);

const purged = await purgeOldDraws();
console.log(`Purged: ${purged} old records`);

process.exit(0);
