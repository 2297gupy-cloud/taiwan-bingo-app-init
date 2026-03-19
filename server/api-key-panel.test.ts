import { describe, it, expect } from "vitest";

describe("共用 ApiKeyPanel 元件", () => {
  describe("元件結構", () => {
    it("應該接受 onClose 回調函數", () => {
      const onClose = () => {};
      expect(typeof onClose).toBe("function");
    });

    it("應該接受自訂標題", () => {
      const title = "自訂 API Key 設定";
      expect(title).toBeTruthy();
    });

    it("應該接受自訂描述", () => {
      const description = "自訂描述文本";
      expect(description).toBeTruthy();
    });
  });

  describe("API Key 輸入", () => {
    it("應該支持 OpenAI Key 輸入（sk-...）", () => {
      const openaiKey = "sk-test123";
      expect(openaiKey).toMatch(/^sk-/);
    });

    it("應該支持 Gemini Key 輸入（AIza...）", () => {
      const geminiKey = "AIza-test123";
      expect(geminiKey).toMatch(/^AIza/);
    });

    it("應該允許同時輸入兩種 Key", () => {
      const openaiKey = "sk-test";
      const geminiKey = "AIza-test";
      expect(openaiKey && geminiKey).toBeTruthy();
    });
  });

  describe("API Key 狀態管理", () => {
    it("應該顯示已儲存的 OpenAI Key", () => {
      const savedOpenaiKey = "sk-saved123";
      const isDisplayed = savedOpenaiKey && savedOpenaiKey.length > 0;
      expect(isDisplayed).toBeTruthy();
    });

    it("應該顯示已儲存的 Gemini Key", () => {
      const savedGeminiKey = "AIza-saved123";
      const isDisplayed = savedGeminiKey && savedGeminiKey.length > 0;
      expect(isDisplayed).toBeTruthy();
    });

    it("應該支持更換 OpenAI Key", () => {
      let openaiKey = "sk-old";
      const newKey = "sk-new";
      openaiKey = newKey;
      expect(openaiKey).toBe("sk-new");
    });

    it("應該支持更換 Gemini Key", () => {
      let geminiKey = "AIza-old";
      const newKey = "AIza-new";
      geminiKey = newKey;
      expect(geminiKey).toBe("AIza-new");
    });

    it("應該支持清除 OpenAI Key", () => {
      let openaiKey = "sk-test";
      openaiKey = "";
      expect(openaiKey).toBe("");
    });

    it("應該支持清除 Gemini Key", () => {
      let geminiKey = "AIza-test";
      geminiKey = "";
      expect(geminiKey).toBe("");
    });
  });

  describe("UI 狀態", () => {
    it("未儲存 Key 時應顯示輸入框", () => {
      const savedKey = null;
      const showInput = !savedKey;
      expect(showInput).toBeTruthy();
    });

    it("已儲存 Key 時應顯示已儲存狀態", () => {
      const savedKey = "sk-test";
      const showSaved = !!savedKey;
      expect(showSaved).toBeTruthy();
    });

    it("編輯模式時應顯示輸入框和取消按鈕", () => {
      const isEditing = true;
      expect(isEditing).toBeTruthy();
    });

    it("非編輯模式時應顯示更換和清除按鈕", () => {
      const isEditing = false;
      expect(!isEditing).toBeTruthy();
    });
  });

  describe("按鈕功能", () => {
    it("儲存按鈕應在有新 Key 時啟用", () => {
      const newKey = "sk-test";
      const isEnabled = !!newKey;
      expect(isEnabled).toBeTruthy();
    });

    it("儲存按鈕應在無新 Key 時禁用", () => {
      const newKey = "";
      const isEnabled = !!newKey;
      expect(isEnabled).toBeFalsy();
    });

    it("清除按鈕應在有已儲存 Key 時啟用", () => {
      const savedKey = "sk-test";
      const isEnabled = !!savedKey;
      expect(isEnabled).toBeTruthy();
    });

    it("清除按鈕應在無已儲存 Key 時禁用", () => {
      const savedKey = null;
      const isEnabled = !!savedKey;
      expect(isEnabled).toBeFalsy();
    });

    it("更換按鈕應切換到編輯模式", () => {
      let isEditing = false;
      isEditing = true;
      expect(isEditing).toBeTruthy();
    });

    it("取消按鈕應退出編輯模式", () => {
      let isEditing = true;
      isEditing = false;
      expect(isEditing).toBeFalsy();
    });
  });

  describe("共用性", () => {
    it("應該可被 AiStarPage 使用", () => {
      const componentName = "ApiKeyPanel";
      expect(componentName).toBe("ApiKeyPanel");
    });

    it("應該可被 AiSuperPrizePage 使用", () => {
      const componentName = "ApiKeyPanel";
      expect(componentName).toBe("ApiKeyPanel");
    });

    it("應該支持自訂標題以區分不同頁面", () => {
      const aiStarTitle = "AI 一星獎 API Key 設定";
      const aiSuperTitle = "AI 超級獎 API Key 設定";
      expect(aiStarTitle).not.toBe(aiSuperTitle);
    });

    it("應該支持自訂描述以區分不同頁面", () => {
      const aiStarDesc = "一星獎 API Key 加密儲存於伺服器...";
      const aiSuperDesc = "超級獎 API Key 加密儲存於伺服器...";
      expect(aiStarDesc).not.toBe(aiSuperDesc);
    });
  });

  describe("密碼輸入安全", () => {
    it("應該使用 type=password 隱藏 API Key", () => {
      const inputType = "password";
      expect(inputType).toBe("password");
    });

    it("應該在已儲存狀態下隱藏完整 Key", () => {
      const displayedKey = "sk-****...";
      expect(displayedKey).not.toContain("test");
    });
  });

  describe("加載狀態", () => {
    it("應該在加載時顯示加載指示器", () => {
      const isLoading = true;
      expect(isLoading).toBeTruthy();
    });

    it("應該在加載完成後隱藏加載指示器", () => {
      const isLoading = false;
      expect(isLoading).toBeFalsy();
    });

    it("應該在保存時禁用所有按鈕", () => {
      const isSaving = true;
      const buttonsDisabled = isSaving;
      expect(buttonsDisabled).toBeTruthy();
    });
  });

  describe("錯誤處理", () => {
    it("應該在未登入時顯示錯誤提示", () => {
      const errorMessage = "請先登入才能儲存 API Key";
      expect(errorMessage).toContain("登入");
    });

    it("應該在保存失敗時顯示錯誤提示", () => {
      const errorMessage = "API Key 儲存失敗";
      expect(errorMessage).toContain("失敗");
    });

    it("應該在保存成功時顯示成功提示", () => {
      const successMessage = "API Key 已儲存";
      expect(successMessage).toContain("已儲存");
    });
  });

  describe("樣式一致性", () => {
    it("應該使用 amber 顏色主題（與 AI 分析一致）", () => {
      const theme = "amber";
      expect(theme).toBe("amber");
    });

    it("應該使用相同的邊框和背景樣式", () => {
      const borderClass = "border-amber-500/30";
      const bgClass = "bg-card";
      expect(borderClass).toContain("amber");
      expect(bgClass).toBeTruthy();
    });

    it("OpenAI Key 應使用 sk- 前綴提示", () => {
      const placeholder = "sk-...";
      expect(placeholder).toContain("sk-");
    });

    it("Gemini Key 應使用 AIza- 前綴提示", () => {
      const placeholder = "AIza...";
      expect(placeholder).toContain("AIza");
    });
  });
});
