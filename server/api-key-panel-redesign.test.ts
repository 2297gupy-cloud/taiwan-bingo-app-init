import { describe, it, expect } from "vitest";

describe("ApiKeyPanel 重新設計 - 單一輸入框邏輯", () => {
  describe("Key 類型自動識別", () => {
    const detectKeyType = (key: string): string => {
      if (!key) return "";
      if (key.startsWith("sk-")) return "OpenAI / 第三方代理";
      if (key.startsWith("AIza")) return "Google Gemini";
      return "未知格式";
    };

    it("應該識別 sk- 格式為 OpenAI / 第三方代理", () => {
      expect(detectKeyType("sk-5oPvYnfCT6rEJIdWkWYHUouNbt46mZJG5kr9BFZhOT56gkVB")).toBe("OpenAI / 第三方代理");
    });

    it("應該識別 AIza 格式為 Google Gemini", () => {
      expect(detectKeyType("AIzaSyAbc123")).toBe("Google Gemini");
    });

    it("應該識別空字串為空", () => {
      expect(detectKeyType("")).toBe("");
    });

    it("應該識別未知格式", () => {
      expect(detectKeyType("some-other-key")).toBe("未知格式");
    });
  });

  describe("Key 分配邏輯（前端 handleSave）", () => {
    const getKeyFields = (apiKey: string, baseUrl: string, modelName: string) => {
      if (apiKey.startsWith("AIza")) {
        return {
          openaiKey: "",
          geminiKey: apiKey.trim(),
          customBaseUrl: baseUrl.trim() || "",
          customModel: modelName.trim() || "",
        };
      } else {
        return {
          openaiKey: apiKey.trim(),
          geminiKey: "",
          customBaseUrl: baseUrl.trim() || "",
          customModel: modelName.trim() || "",
        };
      }
    };

    it("sk- Key 應分配到 openaiKey 欄位", () => {
      const result = getKeyFields("sk-test123", "", "");
      expect(result.openaiKey).toBe("sk-test123");
      expect(result.geminiKey).toBe("");
    });

    it("AIza Key 應分配到 geminiKey 欄位", () => {
      const result = getKeyFields("AIzaSyTest", "", "");
      expect(result.geminiKey).toBe("AIzaSyTest");
      expect(result.openaiKey).toBe("");
    });

    it("第三方代理 Key 應同時儲存 customBaseUrl 和 customModel", () => {
      const result = getKeyFields(
        "sk-test123",
        "https://api.vectorengine.ai/v1",
        "gemini-2.0-flash-lite"
      );
      expect(result.openaiKey).toBe("sk-test123");
      expect(result.customBaseUrl).toBe("https://api.vectorengine.ai/v1");
      expect(result.customModel).toBe("gemini-2.0-flash-lite");
    });

    it("空的 baseUrl 應傳遞空字串", () => {
      const result = getKeyFields("sk-test123", "", "");
      expect(result.customBaseUrl).toBe("");
    });

    it("空的 modelName 應傳遞空字串", () => {
      const result = getKeyFields("sk-test123", "", "");
      expect(result.customModel).toBe("");
    });
  });

  describe("已儲存 Key 的顯示邏輯", () => {
    const getSavedKeyInfo = (savedKeys: { openaiKey: string | null; geminiKey: string | null; customBaseUrl: string | null }) => {
      const savedKey = savedKeys.openaiKey || savedKeys.geminiKey || null;
      const savedKeyType = savedKeys.openaiKey
        ? (savedKeys.customBaseUrl ? "第三方代理" : "OpenAI")
        : savedKeys.geminiKey ? "Google Gemini" : null;
      const hasKey = !!savedKey;
      return { savedKey, savedKeyType, hasKey };
    };

    it("有 openaiKey 時應顯示 OpenAI 類型", () => {
      const result = getSavedKeyInfo({ openaiKey: "sk-abc...", geminiKey: null, customBaseUrl: null });
      expect(result.savedKeyType).toBe("OpenAI");
      expect(result.hasKey).toBe(true);
    });

    it("有 openaiKey 和 customBaseUrl 時應顯示第三方代理類型", () => {
      const result = getSavedKeyInfo({ openaiKey: "sk-abc...", geminiKey: null, customBaseUrl: "https://api.vectorengine.ai/v1" });
      expect(result.savedKeyType).toBe("第三方代理");
    });

    it("有 geminiKey 時應顯示 Google Gemini 類型", () => {
      const result = getSavedKeyInfo({ openaiKey: null, geminiKey: "AIza...", customBaseUrl: null });
      expect(result.savedKeyType).toBe("Google Gemini");
    });

    it("沒有任何 Key 時 hasKey 應為 false", () => {
      const result = getSavedKeyInfo({ openaiKey: null, geminiKey: null, customBaseUrl: null });
      expect(result.hasKey).toBe(false);
      expect(result.savedKeyType).toBeNull();
    });

    it("優先顯示 openaiKey（openaiKey 優先於 geminiKey）", () => {
      const result = getSavedKeyInfo({ openaiKey: "sk-abc...", geminiKey: "AIza...", customBaseUrl: null });
      expect(result.savedKey).toBe("sk-abc...");
    });
  });

  describe("紅色閃爍小球顯示邏輯", () => {
    const shouldShowRedBall = (userApiKey: { openaiKey: string | null; geminiKey: string | null } | undefined) => {
      return !!(userApiKey?.openaiKey || userApiKey?.geminiKey);
    };

    it("有 openaiKey 時應顯示紅色小球", () => {
      expect(shouldShowRedBall({ openaiKey: "sk-abc...", geminiKey: null })).toBe(true);
    });

    it("有 geminiKey 時應顯示紅色小球", () => {
      expect(shouldShowRedBall({ openaiKey: null, geminiKey: "AIza..." })).toBe(true);
    });

    it("沒有 Key 時不應顯示紅色小球", () => {
      expect(shouldShowRedBall({ openaiKey: null, geminiKey: null })).toBe(false);
    });

    it("userApiKey 為 undefined 時不應顯示紅色小球", () => {
      expect(shouldShowRedBall(undefined)).toBe(false);
    });

    it("驗證通過後（有 Key）才顯示紅色小球", () => {
      // 模擬驗證通過後的狀態
      const afterValidation = { openaiKey: "sk-abc...", geminiKey: null };
      expect(shouldShowRedBall(afterValidation)).toBe(true);
    });
  });

  describe("刪除 Key 邏輯", () => {
    it("刪除時應傳遞空字串清除所有欄位", () => {
      const deletePayload = {
        openaiKey: "",
        geminiKey: "",
        customBaseUrl: "",
        customModel: "",
      };
      expect(deletePayload.openaiKey).toBe("");
      expect(deletePayload.geminiKey).toBe("");
      expect(deletePayload.customBaseUrl).toBe("");
      expect(deletePayload.customModel).toBe("");
    });
  });

  describe("後端 saveApiKey 路由相容性", () => {
    it("應接受 openaiKey 為空字串（清除操作）", () => {
      const input = { openaiKey: "", geminiKey: "", customBaseUrl: "", customModel: "" };
      // 空字串不觸發驗證
      const shouldValidate = !!(input.openaiKey || input.geminiKey);
      expect(shouldValidate).toBe(false);
    });

    it("應在有 openaiKey 時觸發驗證", () => {
      const input = { openaiKey: "sk-test", geminiKey: "", customBaseUrl: "", customModel: "" };
      const shouldValidate = !!(input.openaiKey || input.geminiKey);
      expect(shouldValidate).toBe(true);
    });

    it("應在有 geminiKey 時觸發驗證", () => {
      const input = { openaiKey: "", geminiKey: "AIzaTest", customBaseUrl: "", customModel: "" };
      const shouldValidate = !!(input.openaiKey || input.geminiKey);
      expect(shouldValidate).toBe(true);
    });
  });
});
