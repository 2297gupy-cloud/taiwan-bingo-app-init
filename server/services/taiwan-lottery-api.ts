/**
 * 台灣彩券官方 API 連接模組
 * 負責與台灣彩券官方 API 通信，獲取即時開獎數據
 */

import axios from 'axios';
import { toROCDateTime, getCurrentROCDateTime } from '../utils/date-converter';

/**
 * 開獎記錄介面
 */
export interface DrawRecord {
  drawNumber: string;        // 期數 (例: 113000001)
  drawTime: Date;            // 開獎時間
  numbers: number[];         // 開獎號碼 (1-75)
  superNumber: number;       // 超級號碼
  total: number;             // 總和
  bigSmall: 'big' | 'small'; // 大小
  oddEven: 'odd' | 'even';   // 奇偶
  plate: string;             // 盤別
}

/**
 * 台灣彩券 API 客戶端
 */
export class TaiwanLotteryAPI {
  private apiBaseUrl = 'https://api.taiwanlottery.com.tw'; // 實際 API 端點
  private lastDrawNumber: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化 API 客戶端
   */
  constructor() {
    console.log('[TaiwanLotteryAPI] Initialized');
  }

  /**
   * 獲取最新開獎記錄
   * @returns 最新開獎記錄
   */
  async getLatestDraw(): Promise<DrawRecord | null> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/lottery/latest`, {
        timeout: 5000,
      });

      if (response.data && response.data.success) {
        return this.parseDrawRecord(response.data.data);
      }

      console.warn('[TaiwanLotteryAPI] Invalid response format');
      return null;
    } catch (error) {
      console.error('[TaiwanLotteryAPI] Failed to fetch latest draw:', error);
      return null;
    }
  }

  /**
   * 獲取指定期數的開獎記錄
   * @param drawNumber - 期數
   * @returns 開獎記錄
   */
  async getDrawByNumber(drawNumber: string): Promise<DrawRecord | null> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/api/lottery/draw/${drawNumber}`,
        { timeout: 5000 }
      );

      if (response.data && response.data.success) {
        return this.parseDrawRecord(response.data.data);
      }

      return null;
    } catch (error) {
      console.error(`[TaiwanLotteryAPI] Failed to fetch draw ${drawNumber}:`, error);
      return null;
    }
  }

  /**
   * 獲取過去 N 天的開獎記錄
   * @param days - 天數
   * @returns 開獎記錄列表
   */
  async getDrawsInPastDays(days: number): Promise<DrawRecord[]> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/api/lottery/draws`,
        {
          params: { days },
          timeout: 10000,
        }
      );

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data.map((draw: any) => this.parseDrawRecord(draw));
      }

      return [];
    } catch (error) {
      console.error('[TaiwanLotteryAPI] Failed to fetch draws:', error);
      return [];
    }
  }

  /**
   * 檢測新開獎（輪詢）
   * @param callback - 檢測到新開獎時的回調函數
   * @param intervalSeconds - 檢測間隔（秒）
   */
  startPolling(
    callback: (draw: DrawRecord) => Promise<void>,
    intervalSeconds: number = 30
  ): void {
    if (this.syncInterval) {
      console.warn('[TaiwanLotteryAPI] Polling already started');
      return;
    }

    console.log(`[TaiwanLotteryAPI] Starting polling every ${intervalSeconds} seconds`);

    this.syncInterval = setInterval(async () => {
      try {
        const latestDraw = await this.getLatestDraw();

        if (latestDraw && latestDraw.drawNumber !== this.lastDrawNumber) {
          console.log(`[TaiwanLotteryAPI] New draw detected: ${latestDraw.drawNumber}`);
          this.lastDrawNumber = latestDraw.drawNumber;

          try {
            await callback(latestDraw);
          } catch (error) {
            console.error('[TaiwanLotteryAPI] Callback error:', error);
          }
        }
      } catch (error) {
        console.error('[TaiwanLotteryAPI] Polling error:', error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * 停止輪詢
   */
  stopPolling(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[TaiwanLotteryAPI] Polling stopped');
    }
  }

  /**
   * 解析開獎記錄
   * @param data - API 返回的原始數據
   * @returns 解析後的開獎記錄
   */
  private parseDrawRecord(data: any): DrawRecord {
    const numbers = Array.isArray(data.numbers)
      ? data.numbers.map((n: any) => parseInt(n, 10))
      : [];

    const total = numbers.reduce((sum: number, n: number) => sum + n, 0);
    const bigSmall = total > 1900 ? 'big' : 'small';
    const oddEven = total % 2 === 0 ? 'even' : 'odd';

    return {
      drawNumber: data.drawNumber || '',
      drawTime: new Date(data.drawTime || new Date()),
      numbers,
      superNumber: parseInt(data.superNumber, 10) || 0,
      total,
      bigSmall,
      oddEven,
      plate: data.plate || 'A',
    };
  }

  /**
   * 驗證開獎數據的完整性
   * @param draw - 開獎記錄
   * @returns 是否有效
   */
  validateDraw(draw: DrawRecord): boolean {
    // 檢查期數格式
    if (!/^\d{9}$/.test(draw.drawNumber)) {
      console.warn(`[TaiwanLotteryAPI] Invalid draw number: ${draw.drawNumber}`);
      return false;
    }

    // 檢查號碼數量
    if (draw.numbers.length !== 20) {
      console.warn(`[TaiwanLotteryAPI] Invalid number count: ${draw.numbers.length}`);
      return false;
    }

    // 檢查號碼範圍
    if (!draw.numbers.every((n) => n >= 1 && n <= 75)) {
      console.warn('[TaiwanLotteryAPI] Numbers out of range');
      return false;
    }

    // 檢查超級號碼
    if (draw.superNumber < 1 || draw.superNumber > 75) {
      console.warn(`[TaiwanLotteryAPI] Invalid super number: ${draw.superNumber}`);
      return false;
    }

    return true;
  }

  /**
   * 格式化開獎記錄為顯示格式
   * @param draw - 開獎記錄
   * @returns 格式化後的字符串
   */
  formatDrawForDisplay(draw: DrawRecord): string {
    const rocDateTime = toROCDateTime(draw.drawTime);
    const numbersStr = draw.numbers.join(', ');
    return `期數: ${draw.drawNumber}\n時間: ${rocDateTime}\n號碼: ${numbersStr}\n超級號: ${draw.superNumber}\n總和: ${draw.total} (${draw.bigSmall}/${draw.oddEven})`;
  }
}

/**
 * 全局 API 實例
 */
let apiInstance: TaiwanLotteryAPI | null = null;

/**
 * 獲取或創建 API 實例
 */
export function getTaiwanLotteryAPI(): TaiwanLotteryAPI {
  if (!apiInstance) {
    apiInstance = new TaiwanLotteryAPI();
  }
  return apiInstance;
}
