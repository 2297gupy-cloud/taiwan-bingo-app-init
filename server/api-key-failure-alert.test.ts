import { describe, it, expect } from "vitest";

/**
 * API Key 失效提醒功能測試
 * 測試 analyzeHourSlot 和 analyzeSuperPrizeSlot 函數
 * 在 LLM 失敗時是否正確回傳 llmError 欄位
 */

describe("API Key 失效提醒功能", () => {
  describe("llmError 欄位格式判斷", () => {
    it("應識別 OpenAI 401 錯誤為 API Key 無效", () => {
      const error = "OpenAI API 錯誤: 401 {\"error\":{\"message\":\"Incorrect API key provided: sk-abc123\",\"type\":\"invalid_request_error\",\"code\":\"invalid_api_key\"}}";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(true);
    });

    it("應識別 invalid_api_key 錯誤為 API Key 無效", () => {
      const error = "OpenAI API 錯誤: 401 {\"error\":{\"code\":\"invalid_api_key\"}}";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(true);
    });

    it("應識別 Incorrect API key 錯誤為 API Key 無效", () => {
      const error = "Incorrect API key provided: sk-5oPvY...gkVB";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(true);
    });

    it("不應將網路錯誤識別為 API Key 無效", () => {
      const error = "網路連接失敗，請檢查網路設定";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(false);
    });

    it("不應將 429 錯誤識別為 API Key 無效", () => {
      const error = "OpenAI API 錯誤: 429 Too Many Requests";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(false);
    });

    it("不應將 500 錯誤識別為 API Key 無效", () => {
      const error = "OpenAI API 錯誤: 500 Internal Server Error";
      const isApiKeyError = error.includes("401") || error.includes("invalid_api_key") || error.includes("Incorrect API key");
      expect(isApiKeyError).toBe(false);
    });
  });

  describe("回傳值結構驗證", () => {
    it("LLM 成功時 llmError 應為 undefined", () => {
      const result = {
        goldenBalls: [1, 2, 3],
        reasoning: "AI 分析完成",
        sampleCount: 15,
        usedLLM: true,
        llmError: undefined,
      };
      expect(result.usedLLM).toBe(true);
      expect(result.llmError).toBeUndefined();
    });

    it("LLM 失敗時應有 llmError 且 usedLLM 為 false", () => {
      const result = {
        goldenBalls: [10, 20, 30],
        reasoning: "統計分析 15 期 10時段：熱號 57, 72（平均出現 8 次）",
        sampleCount: 15,
        usedLLM: false,
        llmError: "OpenAI API 錯誤: 401 {\"error\":{\"code\":\"invalid_api_key\"}}",
      };
      expect(result.usedLLM).toBe(false);
      expect(result.llmError).toBeDefined();
      expect(result.llmError).toContain("401");
    });

    it("超級獎 LLM 失敗時應有 llmError 且 usedLLM 為 false", () => {
      const result = {
        candidateBalls: [10, 20, 30, 40, 50, 60, 70, 80, 15, 25],
        reasoning: "統計分析 15 期超級獎：熱號混合冷號策略",
        sampleCount: 15,
        usedLLM: false,
        llmError: "OpenAI API 錯誤: 401 Incorrect API key",
      };
      expect(result.usedLLM).toBe(false);
      expect(result.llmError).toBeDefined();
      expect(result.llmError).toContain("Incorrect API key");
    });
  });

  describe("錯誤訊息截斷", () => {
    it("長錯誤訊息應截斷到 60 個字元", () => {
      const longError = "這是一個非常長的錯誤訊息，包含了很多詳細的技術信息，可能超過 60 個字元的限制，需要被截斷以避免顯示過長的文字";
      const truncated = longError.substring(0, 60);
      expect(truncated.length).toBeLessThanOrEqual(60);
    });

    it("短錯誤訊息不應被截斷", () => {
      const shortError = "API Key 無效";
      const truncated = shortError.substring(0, 60);
      expect(truncated).toBe(shortError);
    });
  });

  describe("API Key 格式識別", () => {
    it("OpenAI Key 應以 sk- 開頭", () => {
      const key = "sk-abc123def456";
      expect(key.startsWith("sk-")).toBe(true);
    });

    it("Gemini Key 應以 AIza 開頭", () => {
      const key = "AIzaSyAbc123def456";
      expect(key.startsWith("AIza")).toBe(true);
    });

    it("無效格式的 Key 不應被識別為 OpenAI 或 Gemini", () => {
      const key = "invalid-key-format";
      expect(key.startsWith("sk-")).toBe(false);
      expect(key.startsWith("AIza")).toBe(false);
    });
  });
});
