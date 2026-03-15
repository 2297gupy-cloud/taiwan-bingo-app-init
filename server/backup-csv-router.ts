/**
 * 備份與 CSV 下載 API 路由
 */

import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { getBackupManager } from './services/backup-manager';
import { getCSVExporter } from './services/csv-exporter';
import { getDb } from './db';
import { eq } from 'drizzle-orm';
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
   */
  exportDrawRecordsCSV: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // 計算開始日期
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // 查詢數據
      const records = await db
        .select()
        .from(drawRecords)
        .orderBy(drawRecords.drawTime);

      // 導出為 CSV
      const exporter = getCSVExporter({ dateFormat: 'roc' });
      const csv = exporter.exportDrawRecords(records as any);
      const fileName = exporter.generateFileName('draw_records');

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
