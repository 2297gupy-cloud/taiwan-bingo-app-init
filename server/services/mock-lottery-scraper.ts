/**
 * 模擬台灣彩券爬蟲服務
 * 用於測試環境，每 5 分鐘生成新的開獎數據
 */

/**
 * 開獎記錄介面
 */
export interface MockDrawRecord {
  drawNumber: string;        // 期數
  drawTime: string;          // 開獎時間（民國年份格式：115/03/15 08:10:00）
  numbers: number[];         // 開獎號碼 (1-80)
  superNumber: number;       // 超級號碼
  total: number;             // 總和
  bigSmall: 'big' | 'small'; // 大小
  oddEven: 'odd' | 'even';   // 奇偶
  plate: string;             // 盤別
}

/**
 * 生成隨機開獎號碼
 */
function generateRandomNumbers(count: number = 20): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * 80) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * 計算開獎統計信息
 */
function calculateStats(numbers: number[]) {
  const total = numbers.reduce((sum, n) => sum + n, 0);
  const bigSmall = total > 1900 ? 'big' : 'small';
  const oddEven = total % 2 === 0 ? 'even' : 'odd';
  return { total, bigSmall, oddEven };
}

/**
 * 獲取當前台灣時間（UTC+8）
 */
function getTaiwanTime(): Date {
  const now = new Date();
  // 轉換為 UTC+8
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  return taiwanTime;
}

/**
 * 格式化時間為民國年份字符串
 */
function formatTimeToROC(date: Date): string {
  const year = date.getFullYear();
  const rocYear = year - 1911;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${rocYear}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 生成新的開獎期號
 */
function generateDrawNumber(baseNumber: number = 115014833): string {
  // 每次遞增期號
  return String(baseNumber + 1);
}

/**
 * 模擬台灣彩券爬蟲
 */
export class MockLotteryScraper {
  private lastDrawNumber: number = 115014833;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('[MockLotteryScraper] Initialized');
  }

  /**
   * 生成新的開獎記錄
   */
  generateNewDraw(): MockDrawRecord {
    this.lastDrawNumber++;
    
    const numbers = generateRandomNumbers(20);
    const superNumber = numbers[0]; // 第一個號碼作為超級號碼
    const stats = calculateStats(numbers);
    const bigSmall = stats.bigSmall as 'big' | 'small';
    const oddEven = stats.oddEven as 'odd' | 'even';
    const total = stats.total;
    
    const taiwanTime = getTaiwanTime();
    const drawTime = formatTimeToROC(taiwanTime);
    
    return {
      drawNumber: String(this.lastDrawNumber),
      drawTime,
      numbers,
      superNumber,
      total,
      bigSmall,
      oddEven,
      plate: 'A',
    };
  }

  /**
   * 啟動模擬輪詢
   */
  startPolling(
    callback: (draw: MockDrawRecord) => Promise<void>,
    intervalSeconds: number = 300 // 預設 5 分鐘
  ): void {
    if (this.syncInterval) {
      console.warn('[MockLotteryScraper] Polling already started');
      return;
    }

    console.log(`[MockLotteryScraper] Starting mock polling every ${intervalSeconds} seconds`);

    // 立即生成第一次數據
    (async () => {
      try {
        const draw = this.generateNewDraw();
        console.log(`[MockLotteryScraper] Generated new draw: ${draw.drawNumber} at ${draw.drawTime}`);
        await callback(draw);
      } catch (error) {
        console.error('[MockLotteryScraper] Error on first generation:', error);
      }
    })();

    // 然後每隔指定時間生成新數據
    this.syncInterval = setInterval(async () => {
      try {
        const draw = this.generateNewDraw();
        console.log(`[MockLotteryScraper] Generated new draw: ${draw.drawNumber} at ${draw.drawTime}`);
        
        try {
          await callback(draw);
        } catch (error) {
          console.error('[MockLotteryScraper] Callback error:', error);
        }
      } catch (error) {
        console.error('[MockLotteryScraper] Generation error:', error);
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
      console.log('[MockLotteryScraper] Polling stopped');
    }
  }

  /**
   * 驗證開獎數據
   */
  validateDraw(draw: MockDrawRecord): boolean {
    // 檢查期數格式
    if (!/^\d{9}$/.test(draw.drawNumber)) {
      console.warn(`[MockLotteryScraper] Invalid draw number: ${draw.drawNumber}`);
      return false;
    }

    // 檢查號碼數量
    if (draw.numbers.length !== 20) {
      console.warn(`[MockLotteryScraper] Invalid number count: ${draw.numbers.length}`);
      return false;
    }

    // 檢查號碼範圍
    if (!draw.numbers.every((n) => n >= 1 && n <= 80)) {
      console.warn('[MockLotteryScraper] Numbers out of range');
      return false;
    }

    // 檢查超級號碼
    if (draw.superNumber < 1 || draw.superNumber > 80) {
      console.warn(`[MockLotteryScraper] Invalid super number: ${draw.superNumber}`);
      return false;
    }

    return true;
  }
}

/**
 * 全局模擬爬蟲實例
 */
let mockScraperInstance: MockLotteryScraper | null = null;

/**
 * 獲取或創建模擬爬蟲實例
 */
export function getMockLotteryScraper(): MockLotteryScraper {
  if (!mockScraperInstance) {
    mockScraperInstance = new MockLotteryScraper();
  }
  return mockScraperInstance;
}
