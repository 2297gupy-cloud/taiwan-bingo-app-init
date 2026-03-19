/**
 * CSV 導出功能模組
 * 負責將資料庫數據導出為 CSV 格式
 */

import { toROCDate, toROCDateTime } from '../utils/date-converter';

/**
 * CSV 導出選項介面
 */
export interface CSVExportOptions {
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: BufferEncoding;
  dateFormat?: 'roc' | 'iso';
}

/**
 * CSV 導出器
 */
export class CSVExporter {
  private delimiter: string;
  private dateFormat: 'roc' | 'iso';
  private encoding: BufferEncoding;

  /**
   * 初始化 CSV 導出器
   */
  constructor(options: CSVExportOptions = {}) {
    this.delimiter = options.delimiter || ',';
    this.dateFormat = options.dateFormat || 'roc';
    this.encoding = options.encoding || 'utf-8';
  }

  /**
   * 轉義 CSV 字段
   * @param field - 字段值
   * @returns 轉義後的字段
   */
  private escapeField(field: any): string {
    if (field === null || field === undefined) {
      return '';
    }

    const str = String(field);

    // 如果包含特殊字符，用雙引號包圍並轉義內部的雙引號
    if (str.includes(this.delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * 格式化日期
   * @param date - 日期
   * @returns 格式化後的日期字符串
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (this.dateFormat === 'roc') {
      return toROCDate(d);
    } else {
      return d.toISOString().split('T')[0];
    }
  }

  /**
   * 格式化日期時間
   * @param date - 日期
   * @returns 格式化後的日期時間字符串
   */
  private formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (this.dateFormat === 'roc') {
      return toROCDateTime(d);
    } else {
      return d.toISOString();
    }
  }

  /**
   * 導出開獎記錄為 CSV
   * @param records - 開獎記錄列表
   * @returns CSV 內容
   */
  exportDrawRecords(
    records: Array<{
      id?: number;
      drawNumber: string;
      drawTime: Date | string;
      numbers: number[] | string;
      superNumber: number;
      total: number;
      bigSmall: string;
      oddEven: string;
      plate: string;
    }>
  ): string {
    const headers = ['期數', '開獎時間', '號碼', '超級號', '總和', '大小', '奇偶', '盤別'];
    const rows: string[] = [headers.map((h) => this.escapeField(h)).join(this.delimiter)];

    for (const record of records) {
      const numbers = Array.isArray(record.numbers)
        ? record.numbers.join('|')
        : record.numbers;

      const row = [
        this.escapeField(record.drawNumber),
        this.escapeField(this.formatDateTime(record.drawTime)),
        this.escapeField(numbers),
        this.escapeField(record.superNumber),
        this.escapeField(record.total),
        this.escapeField(this.translateBigSmall(record.bigSmall)),
        this.escapeField(this.translateOddEven(record.oddEven)),
        this.escapeField(record.plate),
      ];

      rows.push(row.join(this.delimiter));
    }

    return rows.join('\n');
  }

  /**
   * 導出 AI 預測為 CSV
   * @param predictions - 預測列表
   * @returns CSV 內容
   */
  exportAIPredictions(
    predictions: Array<{
      id?: number;
      predDate: string;
      sourceHour: string;
      targetHour: string;
      goldenBalls: string;
      aiReasoning?: string;
      isManual: number;
      createdAt?: Date | string;
    }>
  ): string {
    const headers = ['預測日期', '源小時', '目標小時', '黃金球', '推理', '手動', '建立時間'];
    const rows: string[] = [headers.map((h) => this.escapeField(h)).join(this.delimiter)];

    for (const pred of predictions) {
      const row = [
        this.escapeField(pred.predDate),
        this.escapeField(pred.sourceHour),
        this.escapeField(pred.targetHour),
        this.escapeField(pred.goldenBalls),
        this.escapeField(pred.aiReasoning || ''),
        this.escapeField(pred.isManual ? '是' : '否'),
        this.escapeField(
          pred.createdAt ? this.formatDateTime(pred.createdAt) : ''
        ),
      ];

      rows.push(row.join(this.delimiter));
    }

    return rows.join('\n');
  }

  /**
   * 導出玩家統計為 CSV
   * @param stats - 統計列表
   * @returns CSV 內容
   */
  exportPlayerStats(
    stats: Array<{
      id?: number;
      playerId: number;
      totalGames: number;
      bingoCount: number;
      winRate: number;
      bestScore?: number;
      averageDraws: number;
    }>
  ): string {
    const headers = ['玩家 ID', '總遊戲數', '賓果次數', '勝率 (%)', '最佳成績', '平均抽取次數'];
    const rows: string[] = [headers.map((h) => this.escapeField(h)).join(this.delimiter)];

    for (const stat of stats) {
      const row = [
        this.escapeField(stat.playerId),
        this.escapeField(stat.totalGames),
        this.escapeField(stat.bingoCount),
        this.escapeField(stat.winRate),
        this.escapeField(stat.bestScore || ''),
        this.escapeField(stat.averageDraws),
      ];

      rows.push(row.join(this.delimiter));
    }

    return rows.join('\n');
  }

  /**
   * 導出賓果遊戲為 CSV
   * @param games - 遊戲列表
   * @returns CSV 內容
   */
  exportBingoGames(
    games: Array<{
      id?: number;
      roomId: number;
      status: string;
      drawnNumbers: number[] | string;
      winners: number[] | string;
      startedAt?: Date | string;
      finishedAt?: Date | string;
      createdAt?: Date | string;
    }>
  ): string {
    const headers = ['房間 ID', '狀態', '已抽號碼', '獲勝者', '開始時間', '結束時間', '建立時間'];
    const rows: string[] = [headers.map((h) => this.escapeField(h)).join(this.delimiter)];

    for (const game of games) {
      const drawnNumbers = Array.isArray(game.drawnNumbers)
        ? game.drawnNumbers.join('|')
        : game.drawnNumbers;
      const winners = Array.isArray(game.winners)
        ? game.winners.join('|')
        : game.winners;

      const row = [
        this.escapeField(game.roomId),
        this.escapeField(this.translateGameStatus(game.status)),
        this.escapeField(drawnNumbers),
        this.escapeField(winners),
        this.escapeField(game.startedAt ? this.formatDateTime(game.startedAt) : ''),
        this.escapeField(game.finishedAt ? this.formatDateTime(game.finishedAt) : ''),
        this.escapeField(game.createdAt ? this.formatDateTime(game.createdAt) : ''),
      ];

      rows.push(row.join(this.delimiter));
    }

    return rows.join('\n');
  }

  /**
   * 翻譯大小
   */
  private translateBigSmall(value: string): string {
    return value === 'big' ? '大' : '小';
  }

  /**
   * 翻譯奇偶
   */
  private translateOddEven(value: string): string {
    return value === 'odd' ? '奇' : '偶';
  }

  /**
   * 翻譯遊戲狀態
   */
  private translateGameStatus(status: string): string {
    const statusMap: Record<string, string> = {
      waiting: '等待中',
      playing: '進行中',
      finished: '已結束',
    };
    return statusMap[status] || status;
  }

  /**
   * 將 CSV 轉換為 Buffer
   * @param csv - CSV 內容
   * @returns Buffer
   */
  toBuffer(csv: string): Buffer {
    return Buffer.from(csv, this.encoding);
  }

  /**
   * 生成 CSV 文件名
   * @param type - 數據類型
   * @param date - 日期
   * @returns 文件名
   */
  generateFileName(type: string, date: Date = new Date()): string {
    const rocDate = toROCDate(date);
    const timestamp = date.getTime();
    return `${type}_${rocDate}_${timestamp}.csv`;
  }
}

/**
 * 全局 CSV 導出器實例
 */
let csvExporterInstance: CSVExporter | null = null;

/**
 * 獲取或創建 CSV 導出器實例
 */
export function getCSVExporter(options?: CSVExportOptions): CSVExporter {
  if (!csvExporterInstance) {
    csvExporterInstance = new CSVExporter(options);
  }
  return csvExporterInstance;
}
