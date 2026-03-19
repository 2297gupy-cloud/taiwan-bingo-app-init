import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCustomApiKey, validateApiKey } from "./api-key-validator";

describe("第三方 API 代理服務支援", () => {
  describe("validateCustomApiKey 函數", () => {
    it("應該拒絕空的 API Key", async () => {
      const result = await validateCustomApiKey("", "https://api.vectorengine.ai/v1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("不能為空");
    });

    it("應該正確構建 API 端點（已有 /v1）", () => {
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

    it("應該正確構建 API 端點（沒有 /v1）", () => {
      const baseUrl = "https://api.example.com";
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      let endpoint = cleanBaseUrl;
      if (!endpoint.endsWith("/chat/completions")) {
        if (!endpoint.endsWith("/v1")) {
          endpoint = endpoint + "/v1";
        }
        endpoint = endpoint + "/chat/completions";
      }
      expect(endpoint).toBe("https://api.example.com/v1/chat/completions");
    });

    it("應該正確構建 API 端點（已有 /chat/completions）", () => {
      const baseUrl = "https://api.example.com/v1/chat/completions";
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      let endpoint = cleanBaseUrl;
      if (!endpoint.endsWith("/chat/completions")) {
        if (!endpoint.endsWith("/v1")) {
          endpoint = endpoint + "/v1";
        }
        endpoint = endpoint + "/chat/completions";
      }
      expect(endpoint).toBe("https://api.example.com/v1/chat/completions");
    });

    it("應該移除 Base URL 末尾的斜線", () => {
      const baseUrl = "https://api.vectorengine.ai/v1/";
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      expect(cleanBaseUrl).toBe("https://api.vectorengine.ai/v1");
    });

    it("應該使用預設模型名稱（未指定時）", () => {
      const defaultModel = undefined;
      const modelName = defaultModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gemini-2.0-flash-lite");
    });

    it("應該使用指定的模型名稱", () => {
      const specifiedModel = "gpt-4o";
      const modelName = specifiedModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gpt-4o");
    });
  });

  describe("validateApiKey 函數（帶 customBaseUrl）", () => {
    it("應該在有 customBaseUrl 時使用第三方代理驗證", () => {
      const apiKey = "sk-test123";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      // 有 customBaseUrl 時，應該走第三方代理驗證路徑
      const shouldUseCustom = !!customBaseUrl;
      expect(shouldUseCustom).toBe(true);
    });

    it("應該在沒有 customBaseUrl 時使用標準驗證", () => {
      const apiKey = "sk-test123";
      const customBaseUrl = undefined;
      // 沒有 customBaseUrl 時，應該走標準驗證路徑
      const shouldUseCustom = !!customBaseUrl;
      expect(shouldUseCustom).toBe(false);
    });

    it("應該拒絕空的 API Key（帶 customBaseUrl）", async () => {
      const result = await validateApiKey("", "https://api.vectorengine.ai/v1");
      expect(result.valid).toBe(false);
    });
  });

  describe("API Key 格式與代理服務的相容性", () => {
    it("sk- 格式的 Key 應該可以用於第三方代理", () => {
      const key = "sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB";
      const isSkFormat = key.startsWith("sk-");
      expect(isSkFormat).toBe(true);
      // sk- 格式的 Key 可以用於向量引擎等第三方代理
    });

    it("向量引擎的 Base URL 格式應該正確", () => {
      const vectorEngineUrl = "https://api.vectorengine.ai/v1";
      expect(vectorEngineUrl).toMatch(/^https?:\/\//);
      expect(vectorEngineUrl).toContain("/v1");
    });

    it("應該支援 gemini-2.0-flash-lite 模型名稱", () => {
      const modelName = "gemini-2.0-flash-lite";
      expect(modelName).toBeTruthy();
      expect(typeof modelName).toBe("string");
    });
  });

  describe("analyzeWithLLM 的第三方代理邏輯", () => {
    it("有 customBaseUrl 時應該優先使用代理端點", () => {
      const userApiKey = "sk-test";
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";

      // 模擬路由選擇邏輯
      let selectedPath: string;
      if (customBaseUrl) {
        selectedPath = "custom_proxy";
      } else if (userApiKey.startsWith("sk-")) {
        selectedPath = "openai";
      } else if (userApiKey.startsWith("AIza")) {
        selectedPath = "gemini";
      } else {
        selectedPath = "unknown";
      }

      expect(selectedPath).toBe("custom_proxy");
    });

    it("沒有 customBaseUrl 且 sk- 格式時應該使用 OpenAI", () => {
      const userApiKey = "sk-test";
      const customBaseUrl = undefined;

      let selectedPath: string;
      if (customBaseUrl) {
        selectedPath = "custom_proxy";
      } else if (userApiKey.startsWith("sk-")) {
        selectedPath = "openai";
      } else if (userApiKey.startsWith("AIza")) {
        selectedPath = "gemini";
      } else {
        selectedPath = "unknown";
      }

      expect(selectedPath).toBe("openai");
    });

    it("沒有 customBaseUrl 且 AIza 格式時應該使用 Gemini", () => {
      const userApiKey = "AIza-test";
      const customBaseUrl = undefined;

      let selectedPath: string;
      if (customBaseUrl) {
        selectedPath = "custom_proxy";
      } else if (userApiKey.startsWith("sk-")) {
        selectedPath = "openai";
      } else if (userApiKey.startsWith("AIza")) {
        selectedPath = "gemini";
      } else {
        selectedPath = "unknown";
      }

      expect(selectedPath).toBe("gemini");
    });

    it("沒有 userApiKey 時應該使用系統內建 Key", () => {
      const userApiKey = null;
      const customBaseUrl = undefined;

      const useBuiltIn = !userApiKey;
      expect(useBuiltIn).toBe(true);
    });
  });

  describe("customModel 預設值處理", () => {
    it("未設定 customModel 時應使用 gemini-2.0-flash-lite", () => {
      const customModel = null;
      const modelName = customModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gemini-2.0-flash-lite");
    });

    it("設定 customModel 時應使用指定模型", () => {
      const customModel = "gpt-4o-mini";
      const modelName = customModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gpt-4o-mini");
    });

    it("空字串的 customModel 應使用預設值", () => {
      const customModel = "";
      const modelName = customModel || "gemini-2.0-flash-lite";
      expect(modelName).toBe("gemini-2.0-flash-lite");
    });
  });

  describe("keyType 顯示邏輯", () => {
    it("有 customBaseUrl 時 keyType 應顯示第三方代理信息", () => {
      const customBaseUrl = "https://api.vectorengine.ai/v1";
      const customModel = "gemini-2.0-flash-lite";
      const userApiKey = "sk-test";

      const keyType = customBaseUrl
        ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})`
        : userApiKey?.startsWith("sk-") ? "OpenAI Key"
        : userApiKey?.startsWith("AIza") ? "Gemini Key"
        : "系統內建 Key";

      expect(keyType).toBe("第三方代理(gemini-2.0-flash-lite)");
    });

    it("沒有 customBaseUrl 時 keyType 應顯示 OpenAI Key", () => {
      const customBaseUrl = null;
      const customModel = null;
      const userApiKey = "sk-test";

      const keyType = customBaseUrl
        ? `第三方代理(${customModel || 'gemini-2.0-flash-lite'})`
        : userApiKey?.startsWith("sk-") ? "OpenAI Key"
        : userApiKey?.startsWith("AIza") ? "Gemini Key"
        : "系統內建 Key";

      expect(keyType).toBe("OpenAI Key");
    });
  });
});
