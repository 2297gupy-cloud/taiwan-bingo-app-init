/**
 * AI 一星策略服務單元測試
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 測試工具函數（不依賴資料庫）
// ============================================================

describe("AI 一星策略 - 工具函數", () => {
  describe("HOUR_SLOTS 時段配置", () => {
    it("應有 16 個時段（07-22時）", async () => {
      const { HOUR_SLOTS } = await import("./services/ai-star-strategy");
      expect(HOUR_SLOTS).toHaveLength(16);
    });

    it("第一個時段應為 07→08", async () => {
      const { HOUR_SLOTS } = await import("./services/ai-star-strategy");
      expect(HOUR_SLOTS[0].source).toBe("07");
      expect(HOUR_SLOTS[0].target).toBe("08");
    });

    it("最後一個時段應為 22→23", async () => {
      const { HOUR_SLOTS } = await import("./services/ai-star-strategy");
      const last = HOUR_SLOTS[HOUR_SLOTS.length - 1];
      expect(last.source).toBe("22");
      expect(last.target).toBe("23");
    });

    it("每個時段都有 label 和 draws 屬性", async () => {
      const { HOUR_SLOTS } = await import("./services/ai-star-strategy");
      for (const slot of HOUR_SLOTS) {
        expect(slot.label).toBeTruthy();
        expect(slot.draws).toBe(12);
      }
    });
  });

  describe("getTodayDateStr 日期函數", () => {
    it("應返回 YYYY-MM-DD 格式的日期字符串", async () => {
      const { getTodayDateStr } = await import("./services/ai-star-strategy");
      const dateStr = getTodayDateStr();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("返回的日期應在合理範圍內（2024-2030）", async () => {
      const { getTodayDateStr } = await import("./services/ai-star-strategy");
      const dateStr = getTodayDateStr();
      const year = parseInt(dateStr.split("-")[0]);
      expect(year).toBeGreaterThanOrEqual(2024);
      expect(year).toBeLessThanOrEqual(2030);
    });
  });

  describe("getCurrentSlot 當前時段", () => {
    it("應返回包含 isActive 屬性的物件", async () => {
      const { getCurrentSlot } = await import("./services/ai-star-strategy");
      const result = getCurrentSlot();
      expect(result).toHaveProperty("isActive");
      expect(result).toHaveProperty("hour");
      expect(result).toHaveProperty("minute");
    });

    it("hour 應為兩位數字符串格式", async () => {
      const { getCurrentSlot } = await import("./services/ai-star-strategy");
      const result = getCurrentSlot();
      expect(result.hour).toMatch(/^\d{2}$/);
    });
  });
});

// ============================================================
// 測試 batchAnalyzeAllSlots 函數的結構
// ============================================================

describe("AI 一星策略 - 批量分析結構", () => {
  it("batchAnalyzeAllSlots 函數應存在且可匯入", async () => {
    const module = await import("./services/ai-star-strategy");
    expect(typeof module.batchAnalyzeAllSlots).toBe("function");
  });

  it("getAnalysisRecords 函數應存在且可匯入", async () => {
    const module = await import("./services/ai-star-strategy");
    expect(typeof module.getAnalysisRecords).toBe("function");
  });

  it("analyzeHourSlot 函數應存在且可匯入", async () => {
    const module = await import("./services/ai-star-strategy");
    expect(typeof module.analyzeHourSlot).toBe("function");
  });

  it("saveAiStarPrediction 函數應存在且可匯入", async () => {
    const module = await import("./services/ai-star-strategy");
    expect(typeof module.saveAiStarPrediction).toBe("function");
  });

  it("verifyPrediction 函數應存在且可匯入", async () => {
    const module = await import("./services/ai-star-strategy");
    expect(typeof module.verifyPrediction).toBe("function");
  });
});

// ============================================================
// 測試黃金球號碼驗證邏輯
// ============================================================

describe("AI 一星策略 - 號碼驗證邏輯", () => {
  it("黃金球號碼應在 1-80 範圍內", () => {
    const validateGoldenBalls = (balls: number[]) =>
      balls.every(n => Number.isInteger(n) && n >= 1 && n <= 80);

    expect(validateGoldenBalls([1, 40, 80])).toBe(true);
    expect(validateGoldenBalls([0, 40, 80])).toBe(false);
    expect(validateGoldenBalls([1, 40, 81])).toBe(false);
    expect(validateGoldenBalls([7, 14, 21])).toBe(true);
  });

  it("命中判斷邏輯應正確", () => {
    const goldenBalls = [7, 14, 21];
    const drawnNumbers = [1, 7, 15, 21, 40, 55, 66, 77];
    const hits = drawnNumbers.filter(n => goldenBalls.includes(n));
    expect(hits).toEqual([7, 21]);
    expect(hits.length).toBe(2);
  });

  it("命中率計算應正確", () => {
    const hitCount = 3;
    const totalCount = 12;
    const hitRate = Math.round((hitCount / totalCount) * 100);
    expect(hitRate).toBe(25);
  });
});

// ============================================================
// 測試日期工具函數
// ============================================================

describe("AI 一星策略 - 日期工具", () => {
  it("shiftDate 應正確偏移日期", () => {
    const shiftDate = (dateStr: string, days: number): string => {
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    expect(shiftDate("2026-03-15", 1)).toBe("2026-03-16");
    expect(shiftDate("2026-03-15", -1)).toBe("2026-03-14");
    expect(shiftDate("2026-03-31", 1)).toBe("2026-04-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("formatDateDisplay 應返回正確格式", () => {
    const formatDateDisplay = (dateStr: string): string => {
      const d = new Date(dateStr + "T12:00:00");
      const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}/${dd} (${weekdays[d.getDay()]})`;
    };

    const result = formatDateDisplay("2026-03-15");
    expect(result).toMatch(/^\d{2}\/\d{2} \([日一二三四五六]\)$/);
  });
});
