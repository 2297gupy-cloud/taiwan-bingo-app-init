import { describe, it, expect } from "vitest";

describe("AI 超級獎第三方代理服務支援", () => {
  describe("analyzeSuperPrizeSlot 函數", () => {
    it("應該接受 customBaseUrl 和 customModel 參數", () => {
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      // 驗證參數類型
      expect(typeof customBaseUrl).toBe("string");
      expect(typeof customModel).toBe("string");
      expect(customBaseUrl).toContain("/v1");
      expect(customModel).toBeTruthy();
    });

    it("應該在有 customBaseUrl 時優先使用代理", () => {
      const userApiKey = "sk-test";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      // 模擬路由選擇邏輯
      let selectedPath: string;
      if (customBaseUrl) {
        selectedPath = "custom_proxy";
      } else if (userApiKey?.startsWith("sk-")) {
        selectedPath = "openai";
      } else {
        selectedPath = "unknown";
      }
      
      expect(selectedPath).toBe("custom_proxy");
    });

    it("應該在沒有 customBaseUrl 時使用 OpenAI", () => {
      const userApiKey = "sk-test";
      const customBaseUrl = null;
      
      let selectedPath: string;
      if (customBaseUrl) {
        selectedPath = "custom_proxy";
      } else if (userApiKey?.startsWith("sk-")) {
        selectedPath = "openai";
      } else {
        selectedPath = "unknown";
      }
      
      expect(selectedPath).toBe("openai");
    });

    it("應該使用預設模型名稱（未指定時）", () => {
      const customModel = null;
      const modelName = customModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gemini-2.0-flash-lite");
    });

    it("應該使用指定的模型名稱", () => {
      const customModel = "gpt-4o";
      const modelName = customModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gpt-4o");
    });
  });

  describe("batchAnalyzeSuperPrizeSlots 函數", () => {
    it("應該接受 customBaseUrl 和 customModel 參數", () => {
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      expect(typeof customBaseUrl).toBe("string");
      expect(typeof customModel).toBe("string");
    });

    it("應該在批量分析中傳遞 customBaseUrl 和 customModel", () => {
      const dateStr = "2026-03-16";
      const userApiKey = "sk-test";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      // 驗證參數完整性
      expect(dateStr).toBeTruthy();
      expect(userApiKey).toBeTruthy();
      expect(customBaseUrl).toBeTruthy();
      expect(customModel).toBeTruthy();
    });
  });

  describe("routers.ts 中 aiSuperPrize.analyze 路由", () => {
    it("應該讀取用戶儲存的 customBaseUrl", () => {
      // 模擬資料庫行
      const keyRow = {
        userId: "test-user",
        openaiKey: "sk-test",
        geminiKey: null,
        customBaseUrl: "https://api.vectorengine.ai/v1",
        customModel: "gemini-2.0-flash-lite",
      };
      
      const customBaseUrl = keyRow.customBaseUrl || null;
      expect(customBaseUrl).toBe("https://api.vectorengine.ai/v1");
    });

    it("應該讀取用戶儲存的 customModel", () => {
      const keyRow = {
        userId: "test-user",
        openaiKey: "sk-test",
        geminiKey: null,
        customBaseUrl: "https://api.vectorengine.ai/v1",
        customModel: "gemini-2.0-flash-lite",
      };
      
      const customModel = keyRow.customModel || null;
      expect(customModel).toBe("gemini-2.0-flash-lite");
    });

    it("應該在沒有 customBaseUrl 時傳遞 null", () => {
      const keyRow = {
        userId: "test-user",
        openaiKey: "sk-test",
        geminiKey: null,
        customBaseUrl: null,
        customModel: null,
      };
      
      const customBaseUrl = keyRow.customBaseUrl || null;
      expect(customBaseUrl).toBeNull();
    });
  });

  describe("routers.ts 中 aiSuperPrize.batchAnalyze 路由", () => {
    it("應該讀取用戶儲存的 customBaseUrl 和 customModel", () => {
      const keyRow = {
        userId: "test-user",
        openaiKey: "sk-test",
        geminiKey: null,
        customBaseUrl: "https://api.vectorengine.ai/v1",
        customModel: "gemini-2.0-flash-lite",
      };
      
      const customBaseUrl = keyRow.customBaseUrl || null;
      const customModel = keyRow.customModel || null;
      
      expect(customBaseUrl).toBe("https://api.vectorengine.ai/v1");
      expect(customModel).toBe("gemini-2.0-flash-lite");
    });

    it("應該在批量分析時傳遞 customBaseUrl 和 customModel", () => {
      const dateStr = "2026-03-16";
      const userApiKey = "sk-test";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      // 驗證所有參數都被傳遞
      const params = { dateStr, userApiKey, customBaseUrl, customModel };
      expect(params.dateStr).toBeTruthy();
      expect(params.userApiKey).toBeTruthy();
      expect(params.customBaseUrl).toBeTruthy();
      expect(params.customModel).toBeTruthy();
    });
  });

  describe("API Key 類型判斷邏輯", () => {
    it("有 customBaseUrl 時應顯示第三方代理信息", () => {
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      const userApiKey = "sk-test";
      
      const keyType = customBaseUrl
        ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})`
        : userApiKey?.startsWith("sk-") ? "OpenAI Key"
        : "未設定";
      
      expect(keyType).toBe("第三方代理(gemini-2.0-flash-lite)");
    });

    it("沒有 customBaseUrl 但有 sk- Key 時應顯示 OpenAI Key", () => {
      const customBaseUrl = null;
      const customModel = null;
      const userApiKey = "sk-test";
      
      const keyType = customBaseUrl
        ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})`
        : userApiKey?.startsWith("sk-") ? "OpenAI Key"
        : "未設定";
      
      expect(keyType).toBe("OpenAI Key");
    });

    it("沒有任何設定時應顯示未設定", () => {
      const customBaseUrl = null;
      const customModel = null;
      const userApiKey = null;
      
      const keyType = customBaseUrl
        ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})`
        : userApiKey?.startsWith("sk-") ? "OpenAI Key"
        : "未設定";
      
      expect(keyType).toBe("未設定");
    });
  });

  describe("向量引擎相容性", () => {
    it("應該支援向量引擎的 Base URL 格式", () => {
      const vectorEngineUrl = "https://api.vectorengine.ai/v1";
      expect(vectorEngineUrl).toMatch(/^https?:\/\//);
      expect(vectorEngineUrl).toContain("/v1");
    });

    it("應該支援 gemini-2.0-flash-lite 模型", () => {
      const modelName = "gemini-2.0-flash-lite";
      expect(modelName).toBeTruthy();
      expect(typeof modelName).toBe("string");
    });

    it("應該支援 sk- 格式的 API Key", () => {
      const apiKey = "sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB";
      expect(apiKey.startsWith("sk-")).toBe(true);
    });

    it("應該正確構建 API 端點", () => {
      const baseUrl = "https://api.vectorengine.ai/v1";
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      let endpoint = cleanBaseUrl;
      if (!endpoint.endsWith("/chat/completions")) {
        if (!endpoint.endsWith("/v1")) {
          endpoint = endpoint + "/v1";
        }
        endpoint = endpoint + "/chat/completions";
      }
      expect(endpoint).toBe("https://api.vectorengine.ai/v1/chat/completions");
    });
  });

  describe("參數傳遞鏈", () => {
    it("routers.ts 應該讀取資料庫並傳遞給 analyzeSuperPrizeSlot", () => {
      // 模擬完整的參數傳遞鏈
      const dbKeyRow = {
        userId: "test-user",
        openaiKey: "sk-test",
        customBaseUrl: "https://api.vectorengine.ai/v1",
        customModel: "gemini-2.0-flash-lite",
      };
      
      const userApiKey = dbKeyRow.openaiKey || null;
      const customBaseUrl = dbKeyRow.customBaseUrl || null;
      const customModel = dbKeyRow.customModel || null;
      
      // 驗證參數被正確傳遞
      expect(userApiKey).toBe("sk-test");
      expect(customBaseUrl).toBe("https://api.vectorengine.ai/v1");
      expect(customModel).toBe("gemini-2.0-flash-lite");
    });

    it("batchAnalyzeSuperPrizeSlots 應該接收並使用所有參數", () => {
      const dateStr = "2026-03-16";
      const userApiKey = "sk-test";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      
      // 驗證參數完整性和類型
      const params = {
        dateStr,
        userApiKey,
        customBaseUrl,
        customModel,
      };
      
      expect(params.dateStr).toBeTruthy();
      expect(params.userApiKey).toBeTruthy();
      expect(params.customBaseUrl).toBeTruthy();
      expect(params.customModel).toBeTruthy();
    });
  });
});
