/**
 * 備份與 CSV 下載 API 路由
 */

import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { getBackupManager } from './services/backup-manager';
import { getCSVExporter } from './services/csv-exporter';
import { getDb } from './db';
import { eq, desc } from 'drizzle-orm';
import { drawRecords, aiPredictions, playerStats, bingoGames } from '../drizzle/schema';

export const backupCsvRouter = router({
  /**
   * 執行備份
   */
  executeBackup: publicProcedure
    .input(z.object({ backupType: z.enum(['daily', 'interval']).optional() }))
    .mutation(async ({ input }) => {
      const backupManager = getBackupManager();
      const backupLog = await backupManager.executeBackup(input.backupType || 'daily');

      return {
        success: backupLog.status === 'success',
        fileName: backupLog.fileName,
        fileSize: backupLog.fileSize,
        rocDateTime: backupLog.rocDateTime,
        errorMessage: backupLog.errorMessage,
      };
    }),

  /**
   * 獲取備份文件列表
   */
  listBackups: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(({ input }) => {
      const backupManager = getBackupManager();
      const backupFiles = backupManager.getBackupFiles(input.days);

      return {
        count: backupFiles.length,
        files: backupFiles,
      };
    }),

  /**
   * 下載備份文件
   */
  downloadBackup: publicProcedure
    .input(z.object({ fileName: z.string() }))
    .query(({ input }) => {
      const backupManager = getBackupManager();
      const fileContent = backupManager.downloadBackup(input.fileName);

      if (!fileContent) {
        throw new Error('Backup file not found');
      }

      return {
        fileName: input.fileName,
        content: fileContent.toString('base64'),
        size: fileContent.length,
      };
    }),

  /**
   * 導出開獎記錄為 CSV
   * @param days - 天數（不傳則全部）
   * @param limit - 限制筆數（預設 0 = 不限制）
   */
  exportDrawRecordsCSV: publicProcedure
    .input(z.object({
      days: z.number().optional(),
      limit: z.number().min(1).max(10000).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 查詢數據（降序，最新在前）
      let query = db
        .select()
        .from(drawRecords)
        .orderBy(desc(drawRecords.id));

      // 如果指定 limit，取最新 N 筆
      const records = input.limit
        ? await query.limit(input.limit)
        : await query;

      // 導出為 CSV（按日期分組）
      const groupedByDate = new Map<string, typeof records>();
      records.forEach(r => {
        const rawTime = r.drawTime || '';
        // 提取日期部分（格式：115/03/15 或 -1796/03/15）
        const dateMatch = rawTime.match(/^-?\d+\/(\d{2})\/(\d{2})/);
        const dateKey = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}` : 'unknown';
        if (!groupedByDate.has(dateKey)) {
          groupedByDate.set(dateKey, []);
        }
        groupedByDate.get(dateKey)!.push(r);
      });

      // 按日期降序排列（最新在前）
      const sortedDates = Array.from(groupedByDate.keys()).sort().reverse();

      const header = '期數,開獎時間,號碼,超級獎號,大小,單雙';
      const csvLines: string[] = [];

      sortedDates.forEach(dateKey => {
        const dayRecords = groupedByDate.get(dateKey) || [];
        // 同一天內按時間由大到小排序（晚的在前，早的在後）
        dayRecords.sort((a, b) => {
          const timeA = a.drawTime || '';
          const timeB = b.drawTime || '';
          return timeB.localeCompare(timeA);
        });

        csvLines.push(`# ${dateKey}`);
        csvLines.push(header);

        dayRecords.forEach(r => {
          const rawTime = r.drawTime || '';
          const timeDisplay = rawTime.startsWith('-')
            ? rawTime.replace(/^-\d+/, (m) => {
                const rocYear = Math.abs(parseInt(m));
                return String(rocYear + 1911);
              })
            : rawTime;

          const nums = Array.isArray(r.numbers) ? (r.numbers as number[]).sort((a,b)=>a-b).join('|') : '';
          csvLines.push([
            r.drawNumber,
            timeDisplay,
            nums,
            r.superNumber,
            r.bigSmall === 'big' ? '大' : r.bigSmall === 'small' ? '小' : r.bigSmall,
            r.oddEven === 'odd' ? '單' : r.oddEven === 'even' ? '雙' : r.oddEven,
          ].join(','));
        });
        csvLines.push(''); // 空行分隔
      });

      const csv = csvLines.join('\n');

      const suffix = input.limit ? `_最新${input.limit}期` : input.days ? `_${input.days}天` : '_全部';
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const fileName = `bingo_draws${suffix}_${dateStr}.csv`;

      return {
        fileName,
        content: csv,
        recordCount: records.length,
      };
    }),

  /**
   * 導出 AI 預測為 CSV
   */
  exportAIPredictionsCSV: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 計算開始日期
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // 查詢數據
      const predictions = await db
        .select()
        .from(aiPredictions)
        .orderBy(aiPredictions.createdAt);

      // 導出為 CSV
      const exporter = getCSVExporter({ dateFormat: 'roc' });
      const csv = exporter.exportAIPredictions(predictions as any);
      const fileName = exporter.generateFileName('ai_predictions');

      return {
        fileName,
        content: csv,
        recordCount: predictions.length,
      };
    }),

  /**
   * 導出玩家統計為 CSV
   */
  exportPlayerStatsCSV: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 查詢數據
      const stats = await db.select().from(playerStats);

    // 導出為 CSV
    const exporter = getCSVExporter({ dateFormat: 'roc' });
    const csv = exporter.exportPlayerStats(stats as any);
    const fileName = exporter.generateFileName('player_stats');

    return {
      fileName,
      content: csv,
      recordCount: stats.length,
    };
  }),

  /**
   * 導出賓果遊戲為 CSV
   */
  exportBingoGamesCSV: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 計算開始日期
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // 查詢數據
      const games = await db
        .select()
        .from(bingoGames)
        .orderBy(bingoGames.createdAt);

      // 導出為 CSV
      const exporter = getCSVExporter({ dateFormat: 'roc' });
      const csv = exporter.exportBingoGames(games as any);
      const fileName = exporter.generateFileName('bingo_games');

      return {
        fileName,
        content: csv,
        recordCount: games.length,
      };
    }),

  /**
   * 獲取備份統計信息
   */
  getBackupStats: publicProcedure.query(() => {
    const backupManager = getBackupManager();
    const backupFiles = backupManager.getBackupFiles(30);

    return {
      totalBackups: backupFiles.length,
      backupFiles,
      retentionDays: 30,
      lastBackupTime: backupFiles.length > 0 ? new Date() : null,
    };
  }),

  /**
   * 啟動自動備份計劃
   */
  startAutoBackup: publicProcedure.mutation(() => {
    const backupManager = getBackupManager();
    backupManager.startSchedules();

    return {
      success: true,
      message: '自動備份計劃已啟動',
    };
  }),

  /**
   * 停止自動備份計劃
   */
  stopAutoBackup: publicProcedure.mutation(() => {
    const backupManager = getBackupManager();
    backupManager.stopSchedules();

    return {
      success: true,
      message: '自動備份計劃已停止',
    };
  }),
});
