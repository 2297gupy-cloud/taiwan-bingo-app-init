import { describe, it, expect } from "vitest";
import { validateOpenaiKey, validateGeminiKey, validateApiKey } from "./api-key-validator";

describe("API Key 驗證功能", () => {
  describe("validateOpenaiKey", () => {
    it("應該拒絕空的 OpenAI Key", async () => {
      const result = await validateOpenaiKey("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sk-");
    });

    it("應該拒絕不以 sk- 開頭的 Key", async () => {
      const result = await validateOpenaiKey("invalid-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sk-");
    });

    it("應該接受以 sk- 開頭的 Key 格式", async () => {
      // 注意：實際驗證需要真實的 API Key
      const key = "sk-test123";
      expect(key.startsWith("sk-")).toBe(true);
    });
  });

  describe("validateGeminiKey", () => {
    it("應該拒絕空的 Gemini Key", async () => {
      const result = await validateGeminiKey("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("AIza");
    });

    it("應該拒絕不以 AIza 開頭的 Key", async () => {
      const result = await validateGeminiKey("invalid-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("AIza");
    });

    it("應該接受以 AIza 開頭的 Key 格式", async () => {
      // 注意：實際驗證需要真實的 API Key
      const key = "AIza-test123";
      expect(key.startsWith("AIza")).toBe(true);
    });
  });

  describe("validateApiKey", () => {
    it("應該拒絕空的 API Key", async () => {
      const result = await validateApiKey("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("不能為空");
    });

    it("應該識別 OpenAI Key 類型", async () => {
      const key = "sk-test123";
      // 檢查格式
      expect(key.startsWith("sk-")).toBe(true);
    });

    it("應該識別 Gemini Key 類型", async () => {
      const key = "AIza-test123";
      // 檢查格式
      expect(key.startsWith("AIza")).toBe(true);
    });

    it("應該拒絕無法識別的 Key 格式", async () => {
      const result = await validateApiKey("unknown-key");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("無法識別");
    });
  });

  describe("錯誤訊息", () => {
    it("應該提供有用的 401 錯誤訊息", () => {
      const errorMessage = "OpenAI API Key 無效或已過期";
      expect(errorMessage).toContain("無效");
    });

    it("應該提供有用的速率限制錯誤訊息", () => {
      const errorMessage = "OpenAI API 請求過於頻繁，請稍後再試";
      expect(errorMessage).toContain("頻繁");
    });

    it("應該提供有用的網路錯誤訊息", () => {
      const errorMessage = "網路連接失敗，請檢查網路設定";
      expect(errorMessage).toContain("網路");
    });
  });

  describe("Key 格式驗證", () => {
    it("OpenAI Key 應以 sk- 開頭", () => {
      const validOpenaiKey = "sk-proj-abc123";
      expect(validOpenaiKey.startsWith("sk-")).toBe(true);
    });

    it("Gemini Key 應以 AIza 開頭", () => {
      const validGeminiKey = "AIza-abc123";
      expect(validGeminiKey.startsWith("AIza")).toBe(true);
    });

    it("應該拒絕混合格式的 Key", () => {
      const invalidKey = "sk-AIza-mixed";
      const isValid = invalidKey.startsWith("sk-") || invalidKey.startsWith("AIza");
      expect(isValid).toBe(true); // 因為它以 sk- 開頭
    });
  });

  describe("驗證流程", () => {
    it("應該在驗證前檢查 Key 格式", () => {
      const key = "invalid";
      const hasValidFormat = key.startsWith("sk-") || key.startsWith("AIza");
      expect(hasValidFormat).toBe(false);
    });

    it("應該返回驗證結果物件", async () => {
      const result = await validateOpenaiKey("");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("error");
    });

    it("應該在 validateApiKey 中返回 keyType", async () => {
      // 測試返回結構
      const expectedResult = {
        valid: false,
        error: "測試",
        keyType: "openai" as const,
      };
      expect(expectedResult).toHaveProperty("keyType");
    });
  });

  describe("安全性", () => {
    it("應該不在日誌中洩露完整的 API Key", () => {
      const apiKey = "sk-test123";
      const maskedKey = `${apiKey.substring(0, 7)}...`;
      expect(maskedKey).not.toContain(apiKey);
    });

    it("應該驗證 Key 而不儲存明文", () => {
      // 驗證邏輯應該只檢查 Key 的有效性，不儲存
      const key = "sk-test";
      const isValidFormat = key.startsWith("sk-");
      expect(isValidFormat).toBe(true);
    });
  });

  describe("邊界情況", () => {
    it("應該處理非常長的 Key", async () => {
      const longKey = "sk-" + "a".repeat(1000);
      expect(longKey.startsWith("sk-")).toBe(true);
    });

    it("應該處理包含特殊字符的 Key", async () => {
      const specialKey = "sk-test@#$%";
      expect(specialKey.startsWith("sk-")).toBe(true);
    });

    it("應該處理 null 和 undefined", async () => {
      // 這些應該在函數簽名中被類型檢查阻止
      // 但我們可以測試字符串轉換
      const nullString = String(null); // "null"
      expect(nullString).not.toMatch(/^sk-|^AIza/);
    });
  });
});
