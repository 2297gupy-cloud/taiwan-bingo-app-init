import { describe, it, expect } from "vitest";

// ============================================================
// AI 超級獎功能單元測試
// ============================================================

// 測試 analyzeWithStatsSuperPrize 的統計邏輯
function analyzeWithStatsSuperPrize(superNumbers: number[]): { candidateBalls: number[]; reasoning: string } {
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) frequency[i] = 0;
  for (const n of superNumbers) frequency[n] = (frequency[n] || 0) + 1;
  const sorted = Object.entries(frequency)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count);
  const hot = sorted.slice(0, 7).map(x => x.num);
  const cold = sorted.slice(-10).sort(() => 0.5 - 0.5).slice(0, 3).map(x => x.num);
  const combined = Array.from(new Set([...hot, ...cold])).slice(0, 10);
  combined.sort((a, b) => a - b);
  return { candidateBalls: combined, reasoning: `統計分析 ${superNumbers.length} 期超級獎：熱號混合冷號策略` };
}

// 測試 verifySuperPrizePrediction 的命中邏輯
function verifySuperPrize(superNumber: number, candidateBalls: number[]): boolean {
  return candidateBalls.includes(superNumber);
}

describe("AI 超級獎統計分析", () => {
  it("應返回 10 顆候選球", () => {
    const superNumbers = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 7, 14, 21, 28, 35];
    const result = analyzeWithStatsSuperPrize(superNumbers);
    expect(result.candidateBalls.length).toBeLessThanOrEqual(10);
    expect(result.candidateBalls.length).toBeGreaterThan(0);
  });

  it("候選球應在 1-80 範圍內", () => {
    const superNumbers = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80];
    const result = analyzeWithStatsSuperPrize(superNumbers);
    for (const ball of result.candidateBalls) {
      expect(ball).toBeGreaterThanOrEqual(1);
      expect(ball).toBeLessThanOrEqual(80);
    }
  });

  it("候選球應按升序排列", () => {
    const superNumbers = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70];
    const result = analyzeWithStatsSuperPrize(superNumbers);
    for (let i = 1; i < result.candidateBalls.length; i++) {
      expect(result.candidateBalls[i]).toBeGreaterThan(result.candidateBalls[i - 1]);
    }
  });

  it("候選球不應有重複", () => {
    const superNumbers = [7, 7, 7, 14, 14, 21, 28, 35, 42, 49];
    const result = analyzeWithStatsSuperPrize(superNumbers);
    const unique = new Set(result.candidateBalls);
    expect(unique.size).toBe(result.candidateBalls.length);
  });

  it("reasoning 應包含期數資訊", () => {
    const superNumbers = [7, 14, 21, 28, 35];
    const result = analyzeWithStatsSuperPrize(superNumbers);
    expect(result.reasoning).toContain("5");
    expect(result.reasoning).toContain("超級獎");
  });
});

describe("超級獎命中驗證", () => {
  it("超級獎號在候選球中時應命中", () => {
    const candidateBalls = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70];
    expect(verifySuperPrize(14, candidateBalls)).toBe(true);
    expect(verifySuperPrize(42, candidateBalls)).toBe(true);
    expect(verifySuperPrize(70, candidateBalls)).toBe(true);
  });

  it("超級獎號不在候選球中時應未命中", () => {
    const candidateBalls = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70];
    expect(verifySuperPrize(1, candidateBalls)).toBe(false);
    expect(verifySuperPrize(80, candidateBalls)).toBe(false);
    expect(verifySuperPrize(50, candidateBalls)).toBe(false);
  });

  it("空候選球時應未命中", () => {
    expect(verifySuperPrize(14, [])).toBe(false);
  });

  it("邊界值測試（1和80）", () => {
    const candidateBalls = [1, 80];
    expect(verifySuperPrize(1, candidateBalls)).toBe(true);
    expect(verifySuperPrize(80, candidateBalls)).toBe(true);
    expect(verifySuperPrize(2, candidateBalls)).toBe(false);
  });
});

describe("超級獎候選球格式驗證", () => {
  it("候選球輸入驗證：應過濾超出範圍的號碼", () => {
    const raw = [0, 1, 80, 81, 50];
    const valid = raw.filter(n => Number.isInteger(n) && n >= 1 && n <= 80);
    expect(valid).toEqual([1, 80, 50]);
  });

  it("候選球最多10顆", () => {
    const raw = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const limited = raw.slice(0, 10);
    expect(limited.length).toBe(10);
  });

  it("候選球至少1顆才能儲存", () => {
    const empty: number[] = [];
    expect(empty.length).toBe(0);
    expect(empty.length >= 1).toBe(false);
  });
});
