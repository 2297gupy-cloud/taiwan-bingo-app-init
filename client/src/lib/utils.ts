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
export function formatDrawTime(timestamp: number): string {
  const d = new Date(timestamp);
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
export function formatFullDateTime(timestamp: number): string {
  const d = new Date(timestamp);
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
  const totalSeconds = now.getMinutes() * 60 + now.getSeconds();
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
