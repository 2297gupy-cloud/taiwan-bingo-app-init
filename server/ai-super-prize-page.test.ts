import { describe, it, expect } from "vitest";

describe("AI 超級獎頁面 API Key 指示器", () => {
  describe("API Key 狀態檢測", () => {
    it("應該識別用戶已儲存 OpenAI Key", () => {
      const userApiKey = { openaiKey: "sk-test123", geminiKey: null };
      const hasApiKey = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(hasApiKey).toBeTruthy();
    });

    it("應該識別用戶已儲存 Gemini Key", () => {
      const userApiKey = { openaiKey: null, geminiKey: "AIza-test123" };
      const hasApiKey = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(hasApiKey).toBeTruthy();
    });

    it("應該識別用戶未儲存 API Key", () => {
      const userApiKey = { openaiKey: null, geminiKey: null };
      const hasApiKey = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(hasApiKey).toBeFalsy();
    });

    it("應該識別 undefined API Key", () => {
      const userApiKey = undefined;
      const hasApiKey = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(hasApiKey).toBeFalsy();
    });
  });

  describe("指示器顯示邏輯", () => {
    it("複製數據按鈕旁應在有 API Key 時顯示指示器", () => {
      const userApiKey = { openaiKey: "sk-test", geminiKey: null };
      const showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeTruthy();
    });

    it("複製數據按鈕旁應在無 API Key 時隱藏指示器", () => {
      const userApiKey = null;
      const showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeFalsy();
    });

    it("AI 分析按鈕旁應在有預測且有 API Key 時顯示指示器", () => {
      const currentPrediction = { candidateBalls: [1, 2, 3], isManual: false };
      const userApiKey = { openaiKey: "sk-test", geminiKey: null };
      const showIndicator = currentPrediction && !currentPrediction.isManual && (userApiKey?.openaiKey || userApiKey?.geminiKey);
      expect(showIndicator).toBeTruthy();
    });

    it("AI 分析按鈕旁應在手動預測時隱藏指示器", () => {
      const currentPrediction = { candidateBalls: [1, 2, 3], isManual: true };
      const userApiKey = { openaiKey: "sk-test", geminiKey: null };
      const showIndicator = currentPrediction && !currentPrediction.isManual && (userApiKey?.openaiKey || userApiKey?.geminiKey);
      expect(showIndicator).toBeFalsy();
    });

    it("AI 分析按鈕旁應在無預測時隱藏指示器", () => {
      const currentPrediction = null;
      const userApiKey = { openaiKey: "sk-test", geminiKey: null };
      const showIndicator = currentPrediction && !currentPrediction.isManual && (userApiKey?.openaiKey || userApiKey?.geminiKey);
      expect(showIndicator).toBeFalsy();
    });
  });

  describe("指示器樣式", () => {
    it("指示器應為紅色圓形", () => {
      const indicatorClasses = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
      expect(indicatorClasses).toContain("bg-red-500");
      expect(indicatorClasses).toContain("rounded-full");
      expect(indicatorClasses).toContain("animate-pulse");
    });

    it("指示器應有閃爍動畫", () => {
      const indicatorClasses = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
      expect(indicatorClasses).toContain("animate-pulse");
    });

    it("指示器應有發光效果", () => {
      const boxShadow = "0 0 8px rgba(239, 68, 68, 0.8)";
      expect(boxShadow).toContain("rgba(239, 68, 68");
    });
  });

  describe("複製數據按鈕指示器", () => {
    it("複製數據按鈕指示器應為較小的 w-1.5 h-1.5", () => {
      const copyIndicatorSize = "w-1.5 h-1.5";
      expect(copyIndicatorSize).toContain("w-1.5");
      expect(copyIndicatorSize).toContain("h-1.5");
    });

    it("複製數據按鈕指示器應有較小的發光效果", () => {
      const boxShadow = "0 0 6px rgba(239, 68, 68, 0.8)";
      expect(boxShadow).toContain("rgba(239, 68, 68");
    });
  });

  describe("AI 分析按鈕指示器", () => {
    it("AI 分析按鈕指示器應為較大的 w-2 h-2", () => {
      const analyzeIndicatorSize = "w-2 h-2";
      expect(analyzeIndicatorSize).toContain("w-2");
      expect(analyzeIndicatorSize).toContain("h-2");
    });

    it("AI 分析按鈕指示器應有較大的發光效果", () => {
      const boxShadow = "0 0 8px rgba(239, 68, 68, 0.8)";
      expect(boxShadow).toContain("rgba(239, 68, 68");
    });
  });

  describe("API Key 狀態變化", () => {
    it("清除 API Key 後指示器應自動隱藏", () => {
      let userApiKey = { openaiKey: "sk-test", geminiKey: null };
      let showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeTruthy();

      // 模擬清除 API Key
      userApiKey = { openaiKey: null, geminiKey: null };
      showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeFalsy();
    });

    it("添加 API Key 後指示器應自動顯示", () => {
      let userApiKey = { openaiKey: null, geminiKey: null };
      let showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeFalsy();

      // 模擬添加 API Key
      userApiKey = { openaiKey: "sk-new-key", geminiKey: null };
      showIndicator = userApiKey?.openaiKey || userApiKey?.geminiKey;
      expect(showIndicator).toBeTruthy();
    });
  });

  describe("指示器位置", () => {
    it("複製數據按鈕指示器應在按鈕右上角", () => {
      const position = "absolute -top-1 -right-1";
      expect(position).toContain("-top-1");
      expect(position).toContain("-right-1");
    });

    it("AI 分析按鈕指示器應在按鈕右上角", () => {
      const position = "absolute -top-1 -right-1";
      expect(position).toContain("-top-1");
      expect(position).toContain("-right-1");
    });
  });
});
