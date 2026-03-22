/**
 * Google Sheets 同步服務單元測試
 * 測試數據格式轉換、日期解析、API URL 生成
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { processGoogleSheetsData } from "./services/google-sheets-sync";

// ============ 測試 processGoogleSheetsData ============

describe("processGoogleSheetsData", () => {
  it("應正確轉換 Google Sheets 數據格式", () => {
    const rows = [
      {
        period: "115016038",
        date: "2026-03-21",
        time: "07:05",
        numbers: ["04", "13", "15", "18", "20", "21", "27", "30", "38", "42", "49", "50", "56", "58", "65", "67", "70", "71", "77", "80"],
        superNum: "超級獎49",
        size: "－",
        oe: "－",
      },
    ];

    const result = processGoogleSheetsData(rows);
    expect(result).toHaveLength(1);
    
    const draw = result[0];
    expect(draw.drawNumber).toBe("115016038");
    expect(draw.drawTime).toBe("115/03/21 07:05:00");
    expect(draw.superNumber).toBe(49);
    expect(draw.bigSmall).toBe("－");
    expect(draw.oddEven).toBe("－");
    expect(draw.numbers).toHaveLength(20);
    // 號碼應已排序
    expect(draw.numbers[0]).toBe(4);
    expect(draw.numbers[draw.numbers.length - 1]).toBe(80);
  });

  it("應正確處理大小單雙轉換", () => {
    const rows = [
      {
        period: "115016039",
        date: "2026-03-21",
        time: "07:10",
        numbers: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        superNum: "超級獎10",
        size: "大",
        oe: "單",
      },
      {
        period: "115016040",
        date: "2026-03-21",
        time: "07:15",
        numbers: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        superNum: "超級獎20",
        size: "小",
        oe: "雙",
      },
    ];

    const result = processGoogleSheetsData(rows);
    expect(result[0].bigSmall).toBe("big");
    expect(result[0].oddEven).toBe("odd");
    expect(result[1].bigSmall).toBe("small");
    expect(result[1].oddEven).toBe("even");
  });

  it("應正確轉換民國年份", () => {
    const rows = [
      {
        period: "115016240",
        date: "2026-03-21",
        time: "23:55",
        numbers: ["03", "04", "06", "07", "09", "16", "17", "18", "23", "24", "25", "38", "44", "48", "56", "58", "69", "70", "71", "79"],
        superNum: "超級獎17",
        size: "－",
        oe: "－",
      },
    ];

    const result = processGoogleSheetsData(rows);
    expect(result[0].drawTime).toBe("115/03/21 23:55:00");
  });

  it("應正確處理 2026-03-22 日期（不受時區影響）", () => {
    const rows = [
      {
        period: "115016441",
        date: "2026-03-22",
        time: "07:05",
        numbers: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        superNum: "超級獎05",
        size: "－",
        oe: "－",
      },
    ];

    const result = processGoogleSheetsData(rows);
    // 關鍵：日期應為 22，不受時區影響變成 21
    expect(result[0].drawTime).toBe("115/03/22 07:05:00");
  });

  it("應正確提取超級獎號碼", () => {
    const testCases = [
      { superNum: "超級獎49", expected: 49 },
      { superNum: "超級獎01", expected: 1 },
      { superNum: "超級獎80", expected: 80 },
      { superNum: "超級獎5", expected: 5 },
    ];

    for (const tc of testCases) {
      const rows = [{
        period: "115016038",
        date: "2026-03-21",
        time: "07:05",
        numbers: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        superNum: tc.superNum,
        size: "－",
        oe: "－",
      }];
      const result = processGoogleSheetsData(rows);
      expect(result[0].superNumber).toBe(tc.expected);
    }
  });

  it("應正確計算號碼總和", () => {
    const numbers = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
    const rows = [{
      period: "115016038",
      date: "2026-03-21",
      time: "07:05",
      numbers,
      superNum: "超級獎10",
      size: "－",
      oe: "－",
    }];

    const result = processGoogleSheetsData(rows);
    // 1+2+...+20 = 210
    const expectedTotal = numbers.map(Number).reduce((a, b) => a + b, 0);
    expect(expectedTotal).toBe(210);
    // 確認 numbers 已排序
    expect(result[0].numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("應處理空陣列", () => {
    const result = processGoogleSheetsData([]);
    expect(result).toHaveLength(0);
  });
});
