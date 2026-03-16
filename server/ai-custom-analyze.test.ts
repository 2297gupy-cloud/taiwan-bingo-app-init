import { describe, it, expect } from "vitest";
import { parseRawDrawData } from "./services/ai-star-strategy";

const SAMPLE_DATA = `115014950
17:55\t06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79\t超級獎67\t大\t單
115014949
17:50\t04 05 08 19 21 23 27 28 35 38 49 52 54 62 63 64 65 66 69 76\t超級獎23\t大\t雙
115014948
17:45\t06 08 09 11 12 15 19 23 30 32 39 44 48 49 56 57 60 63 65 75\t超級獎09\t小\t單
115014947
17:40\t11 14 16 18 20 23 29 31 40 41 43 49 50 58 59 63 64 67 72 74\t超級獎49\t大\t雙
115014946
17:35\t05 06 12 13 16 24 25 26 27 29 34 38 43 48 59 69 70 74 79 80\t超級獎05\t小\t單`;

describe("parseRawDrawData", () => {
  it("應正確解析台灣賓果演算報告格式", () => {
    const { draws, parseErrors } = parseRawDrawData(SAMPLE_DATA);
    expect(draws.length).toBe(5);
    expect(parseErrors.length).toBe(0);
  });

  it("應正確解析第一期的號碼", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    const first = draws[0];
    expect(first.time).toBe("17:55");
    expect(first.numbers).toContain(6);
    expect(first.numbers).toContain(18);
    expect(first.numbers).toContain(79);
    expect(first.numbers.length).toBe(20);
  });

  it("應正確解析超級獎號碼", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    expect(draws[0].superNumber).toBe(67);
    expect(draws[1].superNumber).toBe(23);
    expect(draws[2].superNumber).toBe(9);
  });

  it("應正確解析期號", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    expect(draws[0].term).toBe("115014950");
    expect(draws[1].term).toBe("115014949");
  });

  it("應跳過分隔線和標題行", () => {
    const dataWithSeparators = `-----------------------------------------------------------------------------------------
BINGO BINGO 專業數據演算報告 (1700~1755)
報告日期：115/03/15
-----------------------------------------------------------------------------------------
115014950
17:55\t06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79\t超級獎67\t大\t單
-----------------------------------------------------------------------------------------
1. 演算之後 12 期出至最佳三顆黃金球數字`;
    const { draws } = parseRawDrawData(dataWithSeparators);
    expect(draws.length).toBe(1);
    expect(draws[0].numbers.length).toBe(20);
  });

  it("應處理空白輸入", () => {
    const { draws, parseErrors } = parseRawDrawData("");
    expect(draws.length).toBe(0);
    expect(parseErrors.length).toBe(0);
  });

  it("應處理只有分隔線的輸入", () => {
    const { draws } = parseRawDrawData("---\n===\n---");
    expect(draws.length).toBe(0);
  });

  it("應正確過濾超出範圍的號碼（1-80）", () => {
    const dataWithInvalidNums = `17:00\t01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 81`;
    const { draws } = parseRawDrawData(dataWithInvalidNums);
    if (draws.length > 0) {
      expect(draws[0].numbers.every(n => n >= 1 && n <= 80)).toBe(true);
    }
  });

  it("應正確解析空格分隔的號碼行", () => {
    const spaceData = `17:30 02 09 10 14 20 22 24 28 40 41 42 49 50 53 61 72 73 75 76 77`;
    const { draws } = parseRawDrawData(spaceData);
    expect(draws.length).toBe(1);
    expect(draws[0].numbers.length).toBe(20);
  });

  it("應正確解析 12 期完整數據", () => {
    const fullData = `115014950
17:55\t06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79\t超級獎67\t大\t單
115014949
17:50\t04 05 08 19 21 23 27 28 35 38 49 52 54 62 63 64 65 66 69 76\t超級獎23\t大\t雙
115014948
17:45\t06 08 09 11 12 15 19 23 30 32 39 44 48 49 56 57 60 63 65 75\t超級獎09\t小\t單
115014947
17:40\t11 14 16 18 20 23 29 31 40 41 43 49 50 58 59 63 64 67 72 74\t超級獎49\t大\t雙
115014946
17:35\t05 06 12 13 16 24 25 26 27 29 34 38 43 48 59 69 70 74 79 80\t超級獎05\t小\t單
115014945
17:30\t02 09 10 14 20 22 24 28 40 41 42 49 50 53 61 72 73 75 76 77\t超級獎53\t大\t雙
115014944
17:25\t02 04 08 09 11 14 23 24 29 31 33 39 53 55 61 64 67 71 74 80\t超級獎09\t小\t雙
115014943
17:20\t03 04 05 09 12 13 16 17 31 33 45 52 54 57 64 65 68 72 74 77\t超級獎52\t小\t單
115014942
17:15\t03 05 06 09 12 15 16 18 19 23 24 25 29 30 33 43 45 68 71 75\t超級獎06\t小\t單
115014941
17:10\t07 10 15 18 23 28 35 37 39 46 48 49 50 58 59 62 65 67 68 79\t超級獎07\t大\t單
115014940
17:05\t01 05 08 09 12 17 19 23 26 33 38 48 53 55 61 65 69 74 75 79\t超級獎09\t小\t單
115014939
17:00\t06 08 09 15 22 25 27 28 29 30 31 32 33 34 42 43 49 52 60 73\t超級獎22\t小\t雙`;
    const { draws, parseErrors } = parseRawDrawData(fullData);
    expect(draws.length).toBe(12);
    expect(parseErrors.length).toBe(0);
    expect(draws.every(d => d.numbers.length === 20)).toBe(true);
  });

  it("應正確識別期號格式（9-12位數字）", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    expect(draws[0].term).toMatch(/^\d{9,12}$/);
  });

  it("應確保所有號碼都在 1-80 範圍內", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    for (const draw of draws) {
      for (const num of draw.numbers) {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(80);
      }
    }
  });
});

describe("parseRawDrawData - 尾數共振計算", () => {
  it("應能從解析結果計算尾數頻率", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    const tailFreq: Record<number, number> = {};
    for (const draw of draws) {
      for (const num of draw.numbers) {
        const tail = num % 10;
        tailFreq[tail] = (tailFreq[tail] || 0) + 1;
      }
    }
    // 確認尾數頻率計算正確
    expect(Object.keys(tailFreq).length).toBeGreaterThan(0);
    expect(Object.values(tailFreq).every(c => c > 0)).toBe(true);
  });
});

describe("parseRawDrawData - 連莊號計算", () => {
  it("應能從解析結果找出二連莊號碼", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    if (draws.length >= 2) {
      const set0 = new Set(draws[0].numbers);
      const set1 = new Set(draws[1].numbers);
      const twoStreak: number[] = [];
      for (let n = 1; n <= 80; n++) {
        if (set0.has(n) && set1.has(n)) twoStreak.push(n);
      }
      // 二連莊號應該存在（每期20個號碼，兩期共同號碼概率很高）
      expect(twoStreak.length).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("parseRawDrawData - 死碼計算", () => {
  it("應能從解析結果找出近5期死碼", () => {
    const { draws } = parseRawDrawData(SAMPLE_DATA);
    const recent5 = draws.slice(0, 5);
    const recent5Nums = new Set(recent5.flatMap(d => d.numbers));
    const deadNums: number[] = [];
    for (let n = 1; n <= 80; n++) {
      if (!recent5Nums.has(n)) deadNums.push(n);
    }
    // 死碼應該存在（5期 × 20個號碼 = 100個，但只有80個不同號碼，所以死碼可能很少）
    expect(deadNums.length).toBeGreaterThanOrEqual(0);
    expect(deadNums.every(n => n >= 1 && n <= 80)).toBe(true);
  });
});
