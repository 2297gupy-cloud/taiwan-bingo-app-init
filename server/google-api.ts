/**
 * Google Apps Script API 集成
 * 使用 Google Apps Script 作為唯一的數據源
 */

const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbwTn1ENAOBNtbxX9jQtayBJwiHtA72_1FCpLNYyxPDudU1IF4pJ13sRFd2DevSHe4rfmQ/exec';

// 緩存配置
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 秒

/**
 * 從 Google API 獲取最新開獎數據
 */
export async function getLatestDraws(limit: number = 20) {
  const cacheKey = `draws_${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=latest&n=${limit}`);
    const json = await response.json();
    
    if (json.success && json.data) {
      cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      return json.data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch latest draws from Google API:', error);
    return [];
  }
}

/**
 * 檢查是否有新期別
 */
export async function checkLatestPeriod() {
  const cacheKey = 'latest_period';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 10 * 1000) {
    return cached.data;
  }

  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=check`);
    const json = await response.json();
    
    if (json.success && json.data) {
      cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      return json.data;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to check latest period from Google API:', error);
    return null;
  }
}

/**
 * 從 Google API 獲取指定日期的開獎數據
 */
export async function getDrawsByDate(dateStr: string) {
  const cacheKey = `draws_${dateStr}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=date&date=${dateStr}`);
    const json = await response.json();
    
    if (json.success && json.data) {
      cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      return json.data;
    }
    
    return [];
  } catch (error) {
    console.error(`Failed to fetch draws for date ${dateStr} from Google API:`, error);
    return [];
  }
}

/**
 * 從 Google API 獲取 AI 預測數據
 */
export async function getAiPredictions(dateStr: string) {
  const cacheKey = `predictions_${dateStr}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=predictions&date=${dateStr}`);
    const json = await response.json();
    
    if (json.success && json.data) {
      const predictions = (json.data || []).map((item: any) => ({
        sourceHour: String(item.sourceHour || item.hour).padStart(2, '0'),
        targetHour: String(item.targetHour || item.hour).padStart(2, '0'),
        goldenBalls: item.goldenBalls || item.balls || [],
        isManual: item.isManual ? 1 : 0,
        reasoning: item.reasoning || '',
      }));
      
      cache.set(cacheKey, { data: predictions, timestamp: Date.now() });
      return predictions;
    }
    
    return [];
  } catch (error) {
    console.error(`Failed to fetch AI predictions for date ${dateStr} from Google API:`, error);
    return [];
  }
}

/**
 * 清除緩存
 */
export function clearCache() {
  cache.clear();
}

/**
 * 清除特定日期的緩存
 */
export function clearCacheForDate(dateStr: string) {
  cache.delete(`draws_${dateStr}`);
  cache.delete(`predictions_${dateStr}`);
}
