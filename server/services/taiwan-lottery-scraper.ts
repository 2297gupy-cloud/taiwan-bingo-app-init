/**
 * 台灣彩券官方網站爬蟲模組
 * 從台灣彩券官方網站提取實時開獎數據
 */

import axios from 'axios';

/**
 * 開獎記錄介面
 */
export interface DrawRecord {
  drawNumber: string;        // 期數
  drawTime: string;          // 開獎時間（民國年份格式：115/03/15 08:10:00）
  numbers: number[];         // 開獎號碼 (1-75)
  superNumber: number;       // 超級號碼
  total: number;             // 總和
  bigSmall: 'big' | 'small'; // 大小
  oddEven: 'odd' | 'even';   // 奇偶
  plate: string;             // 盤別
}

/**
 * 台灣彩券爬蟲客戶端
 */
export class TaiwanLotteryScraper {
  private baseUrl = 'https://www.taiwanlottery.com.tw';
  private lastDrawNumber: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化爬蟲
   */
  constructor() {
    console.log('[TaiwanLotteryScraper] Initialized');
  }

  /**
   * 從官方網站獲取最新開獎記錄
   * @returns 最新開獎記錄
   */
  async getLatestDraw(): Promise<DrawRecord | null> {
    try {
      // 獲取官方網站首頁
      const response = await axios.get(`${this.baseUrl}/lotto/result/bingo_bingo`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // 從 HTML 中提取最新開獎數據
      const draw = this.parseLatestDrawFromHTML(response.data);
      return draw;
    } catch (error) {
      console.error('[TaiwanLotteryScraper] Failed to fetch latest draw:', error);
      return null;
    }
  }

  /**
   * 從 HTML 中解析最新開獎數據
   * @param html - HTML 內容
   * @returns 開獎記錄
   */
  private parseLatestDrawFromHTML(html: string): DrawRecord | null {
    try {
      // 使用正則表達式提取開獎期數
      const drawNumberMatch = html.match(/第(\d{9})期/);
      if (!drawNumberMatch) {
        console.warn('[TaiwanLotteryScraper] Could not find draw number');
        return null;
      }

      const drawNumber = drawNumberMatch[1];

      // 提取開獎時間
      const timeMatch = html.match(/(\d{3})\/(\d{2})\/(\d{2})\(.\)\s*(\d{2}):(\d{2})/);
      if (!timeMatch) {
        console.warn('[TaiwanLotteryScraper] Could not find draw time');
        return null;
      }

      const rocYear = parseInt(timeMatch[1], 10);
      const month = parseInt(timeMatch[2], 10);
      const day = parseInt(timeMatch[3], 10);
      const hours = parseInt(timeMatch[4], 10);
      const minutes = parseInt(timeMatch[5], 10);

      // 直接使用民國年份格式的時間字符串
      const drawTime = `${String(rocYear).padStart(3, '0')}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      // 提取開獎號碼（尋找所有 2 位數字）
      const numbersMatch = html.match(/class="ball[^"]*"[^>]*>(\d{2})<\/span>/g);
      if (!numbersMatch || numbersMatch.length < 20) {
        console.warn('[TaiwanLotteryScraper] Could not find enough numbers');
        return null;
      }

      const numbers: number[] = [];
      for (let i = 0; i < 20; i++) {
        const match = numbersMatch[i].match(/>(\d{2})</);
        if (match) {
          numbers.push(parseInt(match[1], 10));
        }
      }

      // 提取超級號碼
      const superMatch = html.match(/class="super[^"]*"[^>]*>(\d{2})<\/span>/);
      const superNumber = superMatch ? parseInt(superMatch[1], 10) : 0;

      // 計算統計信息
      const total = numbers.reduce((sum, n) => sum + n, 0);
      const bigSmall = total > 1900 ? 'big' : 'small';
      const oddEven = total % 2 === 0 ? 'even' : 'odd';

      return {
        drawNumber,
        drawTime,
        numbers,
        superNumber,
        total,
        bigSmall,
        oddEven,
        plate: 'A',
      };
    } catch (error) {
      console.error('[TaiwanLotteryScraper] Error parsing HTML:', error);
      return null;
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
      console.warn('[TaiwanLotteryScraper] Polling already started');
      return;
    }

    console.log(`[TaiwanLotteryScraper] Starting polling every ${intervalSeconds} seconds`);

    this.syncInterval = setInterval(async () => {
      try {
        const latestDraw = await this.getLatestDraw();

        if (latestDraw && latestDraw.drawNumber !== this.lastDrawNumber) {
          console.log(`[TaiwanLotteryScraper] New draw detected: ${latestDraw.drawNumber}`);
          this.lastDrawNumber = latestDraw.drawNumber;

          try {
            await callback(latestDraw);
          } catch (error) {
            console.error('[TaiwanLotteryScraper] Callback error:', error);
          }
        }
      } catch (error) {
        console.error('[TaiwanLotteryScraper] Polling error:', error);
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
      console.log('[TaiwanLotteryScraper] Polling stopped');
    }
  }

  /**
   * 驗證開獎數據的完整性
   * @param draw - 開獎記錄
   * @returns 是否有效
   */
  validateDraw(draw: DrawRecord): boolean {
    // 檢查期數格式
    if (!/^\d{9}$/.test(draw.drawNumber)) {
      console.warn(`[TaiwanLotteryScraper] Invalid draw number: ${draw.drawNumber}`);
      return false;
    }

    // 檢查號碼數量
    if (draw.numbers.length !== 20) {
      console.warn(`[TaiwanLotteryScraper] Invalid number count: ${draw.numbers.length}`);
      return false;
    }

    // 檢查號碼範圍
    if (!draw.numbers.every((n) => n >= 1 && n <= 75)) {
      console.warn('[TaiwanLotteryScraper] Numbers out of range');
      return false;
    }

    // 檢查超級號碼
    if (draw.superNumber < 1 || draw.superNumber > 75) {
      console.warn(`[TaiwanLotteryScraper] Invalid super number: ${draw.superNumber}`);
      return false;
    }

    return true;
  }
}

/**
 * 全局爬蟲實例
 */
let scraperInstance: TaiwanLotteryScraper | null = null;

/**
 * 獲取或創建爬蟲實例
 */
export function getTaiwanLotteryScraper(): TaiwanLotteryScraper {
  if (!scraperInstance) {
    scraperInstance = new TaiwanLotteryScraper();
  }
  return scraperInstance;
}
