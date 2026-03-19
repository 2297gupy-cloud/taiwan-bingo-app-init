/**
 * 台灣民國年份轉換工具
 * 將西元年份轉換為民國年份（115 年 = 2026 年）
 */

/**
 * 將西元日期轉換為民國年份格式
 * @param date - 日期物件或日期字符串
 * @returns 民國年份格式字符串 (例: 115/03/14)
 */
export function toROCDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  // 民國年份 = 西元年份 - 1911
  const rocYear = year - 1911;
  
  return `${rocYear}/${month}/${day}`;
}

/**
 * 將西元日期轉換為民國年份格式（含時間）
 * @param date - 日期物件或日期字符串
 * @returns 民國年份格式字符串 (例: 115/03/14 20:30:45)
 */
export function toROCDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const rocDate = toROCDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${rocDate} ${hours}:${minutes}:${seconds}`;
}

/**
 * 將民國日期轉換為西元日期
 * @param rocDate - 民國年份格式字符串 (例: 115/03/14)
 * @returns Date 物件
 */
export function fromROCDate(rocDate: string): Date {
  const [rocYear, month, day] = rocDate.split('/').map(Number);
  const year = rocYear + 1911;
  
  return new Date(year, month - 1, day);
}

/**
 * 格式化時間戳記為民國年份格式
 * @param timestamp - Unix 時間戳記（毫秒）
 * @returns 民國年份格式字符串
 */
export function formatTimestampToROC(timestamp: number): string {
  return toROCDateTime(new Date(timestamp));
}

/**
 * 獲取當前日期的民國年份格式
 * @returns 民國年份格式字符串 (例: 115/03/14)
 */
export function getCurrentROCDate(): string {
  return toROCDate(new Date());
}

/**
 * 獲取當前日期時間的民國年份格式
 * @returns 民國年份格式字符串 (例: 115/03/14 20:30:45)
 */
export function getCurrentROCDateTime(): string {
  return toROCDateTime(new Date());
}

/**
 * 計算兩個日期之間的天數差
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 天數差
 */
export function getDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 獲取過去 N 天的日期列表（民國格式）
 * @param days - 天數
 * @returns 民國年份格式日期列表
 */
export function getPastDatesROC(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(toROCDate(date));
  }
  
  return dates;
}

/**
 * 檢查是否為有效的民國日期格式
 * @param rocDate - 民國年份格式字符串
 * @returns 是否有效
 */
export function isValidROCDate(rocDate: string): boolean {
  const regex = /^\d{3}\/\d{2}\/\d{2}$/;
  if (!regex.test(rocDate)) return false;
  
  const [rocYear, month, day] = rocDate.split('/').map(Number);
  
  // 檢查月份和日期範圍
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // 檢查民國年份範圍（100-150 年）
  if (rocYear < 100 || rocYear > 150) return false;
  
  return true;
}
