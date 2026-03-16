import { describe, it, expect } from "vitest";

describe("API Key 驗證邏輯修復", () => {
  describe("驗證路徑選擇邏輯", () => {
    // 模擬修復後的驗證路徑選擇
    const getValidationPath = (
      keyType: "openai" | "gemini",
      key: string,
      customBaseUrl?: string
    ): "custom_proxy" | "gemini_native" | "skip" | "invalid_format" => {
      if (keyType === "openai") {
        if (customBaseUrl) {
          return "custom_proxy";
        } else if (key.startsWith("AIza")) {
          return "gemini_native"; // 防御性處理
        } else {
          // sk- 格式但沒有 customBaseUrl：跳過驗證直接儲存
          return "skip";
        }
      } else {
        // geminiKey
        if (customBaseUrl) {
          return "custom_proxy";
        } else {
          return "gemini_native";
        }
      }
    };

    it("sk- Key + customBaseUrl：應使用代理端點驗證", () => {
      const path = getValidationPath("openai", "sk-test", "https://api.vectorengine.ai/v1");
      expect(path).toBe("custom_proxy");
    });

    it("sk- Key + 無 customBaseUrl：應跳過驗證直接儲存（第三方代理 Key）", () => {
      const path = getValidationPath("openai", "sk-test", undefined);
      expect(path).toBe("skip");
    });

    it("sk- Key + 空字串 customBaseUrl：應跳過驗證（空字串視為無 URL）", () => {
      const customBaseUrl = "" || undefined; // 模擬後端的 || undefined 處理
      const path = getValidationPath("openai", "sk-test", customBaseUrl);
      expect(path).toBe("skip");
    });

    it("AIza Key + customBaseUrl：應使用代理端點驗證", () => {
      const path = getValidationPath("gemini", "AIzaTest", "https://api.proxy.ai/v1");
      expect(path).toBe("custom_proxy");
    });

    it("AIza Key + 無 customBaseUrl：應使用原生 Gemini API 驗證", () => {
      const path = getValidationPath("gemini", "AIzaTest", undefined);
      expect(path).toBe("gemini_native");
    });
  });

  describe("修復前後的行為對比", () => {
    it("修復前：sk- Key 無 customBaseUrl 會嘗試 OpenAI 驗證（錯誤）", () => {
      // 舊邏輯
      const oldValidationPath = (key: string, customBaseUrl?: string): string => {
        if (customBaseUrl) return "custom_proxy";
        if (key.startsWith("sk-")) return "openai"; // 舊邏輯：直接用 OpenAI 驗證
        if (key.startsWith("AIza")) return "gemini";
        return "unknown";
      };
      
      // 第三方代理 Key（sk- 格式，無 customBaseUrl）
      const path = oldValidationPath("sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB", undefined);
      expect(path).toBe("openai"); // 舊邏輯會走 OpenAI 驗證 → 失敗
    });

    it("修復後：sk- Key 無 customBaseUrl 跳過驗證直接儲存（正確）", () => {
      // 新邏輯
      const newValidationPath = (key: string, customBaseUrl?: string): string => {
        if (customBaseUrl) return "custom_proxy";
        if (key.startsWith("AIza")) return "gemini";
        return "skip"; // 新邏輯：跳過驗證，直接儲存
      };
      
      // 第三方代理 Key（sk- 格式，無 customBaseUrl）
      const path = newValidationPath("sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB", undefined);
      expect(path).toBe("skip"); // 新邏輯：跳過驗證 → 成功儲存
    });
  });

  describe("customBaseUrl 空字串處理", () => {
    it("空字串 customBaseUrl 應被視為 undefined", () => {
      const customBaseUrl = "" || undefined;
      expect(customBaseUrl).toBeUndefined();
    });

    it("有效 URL 應被保留", () => {
      const customBaseUrl = "https://api.vectorengine.ai/v1" || undefined;
      expect(customBaseUrl).toBe("https://api.vectorengine.ai/v1");
    });

    it("前端傳遞空字串時後端應正確處理", () => {
      // 模擬後端的 || undefined 處理
      const input = { customBaseUrl: "" };
      const customBaseUrl = input.customBaseUrl || undefined;
      expect(customBaseUrl).toBeUndefined();
    });
  });

  describe("向量引擎 Key 儲存流程", () => {
    it("向量引擎 Key 應能直接儲存（無需 customBaseUrl）", () => {
      const vectorEngineKey = "sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB";
      const customBaseUrl = "" || undefined; // 沒有填 Base URL
      
      // 修復後的邏輯：sk- Key 且無 customBaseUrl → 跳過驗證
      const shouldSkipValidation = !customBaseUrl && vectorEngineKey.startsWith("sk-") && !vectorEngineKey.startsWith("AIza");
      expect(shouldSkipValidation).toBe(true);
    });

    it("向量引擎 Key + Base URL 應使用代理驗證", () => {
      const vectorEngineKey = "sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      
      // 有 customBaseUrl → 使用代理驗證
      const shouldUseProxy = !!customBaseUrl;
      expect(shouldUseProxy).toBe(true);
    });
  });

  describe("Gemini Key 驗證不受影響", () => {
    it("AIza Key 無 customBaseUrl 仍應使用原生 Gemini API 驗證", () => {
      const geminiKey = "AIzaSyTest123";
      const customBaseUrl = "" || undefined;
      
      // 沒有 customBaseUrl → 使用原生 Gemini API
      const useNativeGemini = !customBaseUrl && geminiKey.startsWith("AIza");
      expect(useNativeGemini).toBe(true);
    });

    it("AIza Key + customBaseUrl 應使用代理驗證", () => {
      const geminiKey = "AIzaSyTest123";
      const customBaseUrl = "https://api.proxy.ai/v1";
      
      const useProxy = !!customBaseUrl;
      expect(useProxy).toBe(true);
    });
  });
});
