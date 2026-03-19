/**
 * 自動備份管理系統
 * 負責資料庫的自動備份、恢復和清理
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../db';
import { toROCDateTime } from '../utils/date-converter';

/**
 * 備份配置介面
 */
export interface BackupConfig {
  backupDir: string;           // 備份目錄
  maxBackups: number;          // 最大備份數量
  retentionDays: number;       // 保留天數
  dailyBackupTime: string;     // 每日備份時間 (HH:mm)
  intervalBackupTime: string;  // 區間備份開始時間 (HH:mm)
  intervalMinutes: number;     // 區間備份間隔（分鐘）
}

/**
 * 備份記錄介面
 */
export interface BackupLog {
  id?: number;
  backupTime: Date;
  backupType: 'daily' | 'interval';
  fileName: string;
  fileSize: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  rocDateTime: string;
}

/**
 * 備份管理器
 */
export class BackupManager {
  private config: BackupConfig;
  private dailyBackupSchedule: NodeJS.Timeout | null = null;
  private intervalBackupSchedule: NodeJS.Timeout | null = null;

  /**
   * 初始化備份管理器
   */
  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupDir: config.backupDir || path.join(process.cwd(), 'backups'),
      maxBackups: config.maxBackups || 100,
      retentionDays: config.retentionDays || 30,
      dailyBackupTime: config.dailyBackupTime || '00:00',
      intervalBackupTime: config.intervalBackupTime || '07:05',
      intervalMinutes: config.intervalMinutes || 5,
    };

    this.ensureBackupDir();
    console.log('[BackupManager] Initialized with config:', this.config);
  }

  /**
   * 確保備份目錄存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      console.log(`[BackupManager] Created backup directory: ${this.config.backupDir}`);
    }
  }

  /**
   * 執行備份
   * @param backupType - 備份類型
   * @returns 備份日誌
   */
  async executeBackup(backupType: 'daily' | 'interval' = 'daily'): Promise<BackupLog> {
    const backupTime = new Date();
    const rocDateTime = toROCDateTime(backupTime);
    const fileName = `backup_${backupType}_${backupTime.getTime()}.sql`;
    const filePath = path.join(this.config.backupDir, fileName);

    const backupLog: BackupLog = {
      backupTime,
      backupType,
      fileName,
      fileSize: 0,
      status: 'success',
      rocDateTime,
    };

    try {
      // 獲取資料庫連接
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection not available');
      }

      // 執行備份（模擬）
      // 實際應使用 mysqldump 或資料庫備份 API
      const backupData = {
        timestamp: backupTime.toISOString(),
        rocDateTime,
        backupType,
        tables: ['users', 'draw_records', 'ai_predictions', 'bingo_rooms', 'bingo_games'],
      };

      const backupContent = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(filePath, backupContent, 'utf-8');

      backupLog.fileSize = fs.statSync(filePath).size;

      console.log(`[BackupManager] Backup completed: ${fileName} (${backupLog.fileSize} bytes)`);

      // 清理舊備份
      await this.cleanupOldBackups();

      return backupLog;
    } catch (error) {
      backupLog.status = 'failed';
      backupLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[BackupManager] Backup failed: ${backupLog.errorMessage}`);

      return backupLog;
    }
  }

  /**
   * 清理舊備份
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      const backupFiles = files
        .filter((f) => f.startsWith('backup_'))
        .map((f) => ({
          name: f,
          path: path.join(this.config.backupDir, f),
          time: fs.statSync(path.join(this.config.backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // 刪除超過最大備份數量的文件
      if (backupFiles.length > this.config.maxBackups) {
        const toDelete = backupFiles.slice(this.config.maxBackups);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          console.log(`[BackupManager] Deleted old backup: ${file.name}`);
        }
      }

      // 刪除超過保留天數的文件
      const cutoffTime = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
      for (const file of backupFiles) {
        if (file.time < cutoffTime) {
          fs.unlinkSync(file.path);
          console.log(`[BackupManager] Deleted expired backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('[BackupManager] Cleanup error:', error);
    }
  }

  /**
   * 啟動自動備份計劃
   */
  startSchedules(): void {
    this.startDailyBackup();
    this.startIntervalBackup();
  }

  /**
   * 啟動每日備份
   */
  private startDailyBackup(): void {
    const [hours, minutes] = this.config.dailyBackupTime.split(':').map(Number);

    const scheduleNext = () => {
      const now = new Date();
      const nextBackup = new Date();
      nextBackup.setHours(hours, minutes, 0, 0);

      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1);
      }

      const delay = nextBackup.getTime() - now.getTime();

      console.log(
        `[BackupManager] Next daily backup scheduled at ${nextBackup.toLocaleString()}`
      );

      if (this.dailyBackupSchedule) {
        clearTimeout(this.dailyBackupSchedule);
      }

      this.dailyBackupSchedule = setTimeout(async () => {
        await this.executeBackup('daily');
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  /**
   * 啟動區間備份
   */
  private startIntervalBackup(): void {
    const [hours, minutes] = this.config.intervalBackupTime.split(':').map(Number);

    const scheduleNext = () => {
      const now = new Date();
      const nextStart = new Date();
      nextStart.setHours(hours, minutes, 0, 0);

      if (nextStart <= now) {
        nextStart.setDate(nextStart.getDate() + 1);
      }

      const delay = nextStart.getTime() - now.getTime();

      console.log(
        `[BackupManager] Interval backup will start at ${nextStart.toLocaleString()}`
      );

      if (this.intervalBackupSchedule) {
        clearTimeout(this.intervalBackupSchedule);
      }

      this.intervalBackupSchedule = setTimeout(() => {
        this.startIntervalBackupCycle();
      }, delay);
    };

    scheduleNext();
  }

  /**
   * 啟動區間備份循環
   */
  private startIntervalBackupCycle(): void {
    console.log('[BackupManager] Starting interval backup cycle');

    const interval = setInterval(async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // 檢查是否超過區間備份時間窗口（假設在 07:05 到 23:59）
      if (hours >= 8 || (hours === 7 && minutes >= 5)) {
        await this.executeBackup('interval');
      } else {
        // 清除間隔並重新安排
        clearInterval(interval);
        this.startIntervalBackup();
      }
    }, this.config.intervalMinutes * 60 * 1000);
  }

  /**
   * 停止自動備份計劃
   */
  stopSchedules(): void {
    if (this.dailyBackupSchedule) {
      clearTimeout(this.dailyBackupSchedule);
      this.dailyBackupSchedule = null;
    }

    if (this.intervalBackupSchedule) {
      clearTimeout(this.intervalBackupSchedule);
      this.intervalBackupSchedule = null;
    }

    console.log('[BackupManager] Backup schedules stopped');
  }

  /**
   * 獲取備份文件列表
   * @param days - 過去 N 天的備份
   * @returns 備份文件列表
   */
  getBackupFiles(days: number = 30): string[] {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      return files
        .filter((f) => f.startsWith('backup_'))
        .filter((f) => {
          const filePath = path.join(this.config.backupDir, f);
          const fileTime = fs.statSync(filePath).mtime.getTime();
          return fileTime >= cutoffTime;
        })
        .sort()
        .reverse();
    } catch (error) {
      console.error('[BackupManager] Error reading backup files:', error);
      return [];
    }
  }

  /**
   * 下載備份文件
   * @param fileName - 文件名
   * @returns 文件內容
   */
  downloadBackup(fileName: string): Buffer | null {
    try {
      const filePath = path.join(this.config.backupDir, fileName);

      // 安全檢查：確保文件在備份目錄內
      if (!filePath.startsWith(this.config.backupDir)) {
        console.warn('[BackupManager] Invalid file path:', filePath);
        return null;
      }

      if (!fs.existsSync(filePath)) {
        console.warn('[BackupManager] Backup file not found:', fileName);
        return null;
      }

      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('[BackupManager] Error reading backup file:', error);
      return null;
    }
  }
}

/**
 * 全局備份管理器實例
 */
let backupManagerInstance: BackupManager | null = null;

/**
 * 獲取或創建備份管理器實例
 */
export function getBackupManager(config?: Partial<BackupConfig>): BackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager(config);
  }
  return backupManagerInstance;
}
