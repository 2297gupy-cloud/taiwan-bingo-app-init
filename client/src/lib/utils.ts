import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 格式化期號顯示 */
export function formatDrawNumber(drawNumber: string): string {
  return `No. ${drawNumber}`;
}

/** 格式化時間戳為本地時間（民國年份格式） */
export function formatDrawTime(timestamp: number | Date | string): string {
  // 如果已經是民國年份格式的字符串，直接返回
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else if (typeof timestamp === 'number') {
    // 自動判斷是綒級還是毫綒級時間戳
    // 綒級時間戳通常小於 10^11，毫綒級通常大於 10^12
    const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    d = new Date(ts);
  } else {
    return '';
  }
  const year = d.getFullYear();
  const rocYear = year - 1911; // 民國年份 = 西元年份 - 1911
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${rocYear}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/** 格式化完整日期時間（民國年份格式） */
export function formatFullDateTime(timestamp: number | Date | string): string {
  // 如果已經是民國年份格式的字符串，直接返回
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else if (typeof timestamp === 'number') {
    // 自動判斷是綒級還是毫綒級時間戳
    const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    d = new Date(ts);
  } else {
    return '';
  }
  const year = d.getFullYear();
  const rocYear = year - 1911; // 民國年份 = 西元年份 - 1911
  return `${rocYear}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function getBigSmallLabel(val: string): string {
  return val === "big" ? "大" : val === "small" ? "小" : "和";
}

export function getOddEvenLabel(val: string): string {
  return val === "odd" ? "單" : "雙";
}

export function getPlateLabel(val: string): string {
  return val === "upper" ? "上" : val === "lower" ? "下" : "中";
}

export function getBigSmallClass(val: string): string {
  return val === "big" ? "tag-big" : val === "small" ? "tag-small" : "text-muted-foreground";
}

export function getOddEvenClass(val: string): string {
  return val === "odd" ? "tag-odd" : "tag-even";
}

export function getPlateClass(val: string): string {
  return val === "upper" ? "tag-upper" : val === "lower" ? "tag-lower" : "tag-middle";
}

export function getCountdown(): { minutes: number; seconds: number } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // 開獎時間：07:05 ~ 23:50，每 5 分鐘一期（共 204 期）
  // 23:50 是最後一次開獎，之後倒數到隔天 07:05
  // 如果當前時間在 23:50 之後或 07:05 之前，倒數到隔天 07:05
  if (hours < 7 || (hours === 7 && minutes < 5) || hours > 23 || (hours === 23 && minutes >= 50)) {
    // 計算距離下一個開獎時間的秒數
    let targetDate = new Date();
    
    if (hours < 7 || (hours === 7 && minutes < 5)) {
      // 今天 07:05
      targetDate.setHours(7, 5, 0, 0);
    } else {
      // 隔天 07:05
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(7, 5, 0, 0);
    }
    
    const diff = targetDate.getTime() - now.getTime();
    const totalSecs = Math.floor(diff / 1000);
    return {
      minutes: Math.floor(totalSecs / 60),
      seconds: totalSecs % 60,
    };
  }
  
  // 在開獎時間內（07:05 ~ 23:55），計算距離下一個 5 分鐘倍數的秒數
  const totalSeconds = minutes * 60 + seconds;
  const fiveMinSeconds = 5 * 60;
  const remaining = fiveMinSeconds - (totalSeconds % fiveMinSeconds);
  
  return {
    minutes: Math.floor(remaining / 60),
    seconds: remaining % 60,
  };
}

export function padNumber(num: number): string {
  return String(num).padStart(2, "0");
}
