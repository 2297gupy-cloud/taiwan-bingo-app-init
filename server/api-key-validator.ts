import { invokeLLM } from "./_core/llm";

/**
 * 驗證 OpenAI API Key 的有效性
 * 通過發送最小化的 API 請求來測試 Key
 */
export async function validateOpenaiKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return {
      valid: false,
      error: "OpenAI Key 必須以 'sk-' 開頭",
    };
  }

  try {
    // 使用 LLM 幫助函數進行驗證
    // 該函數內部會使用提供的 API Key
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: "Say 'ok' in one word.",
        },
      ],
    });

    if (response && response.choices && response.choices.length > 0) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: "OpenAI API 響應異常",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 根據錯誤訊息判斷具體原因
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return {
        valid: false,
        error: "OpenAI API Key 無效或已過期",
      };
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return {
        valid: false,
        error: "OpenAI API 請求過於頻繁，請稍後再試",
      };
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      return {
        valid: false,
        error: "網路連接失敗，請檢查網路設定",
      };
    } else {
      return {
        valid: false,
        error: `OpenAI API 驗證失敗：${errorMessage.substring(0, 100)}`,
      };
    }
  }
}

/**
 * 驗證 Google Gemini API Key 的有效性
 * 通過發送最小化的 API 請求來測試 Key
 */
export async function validateGeminiKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!apiKey || !apiKey.startsWith("AIza")) {
    return {
      valid: false,
      error: "Gemini Key 必須以 'AIza' 開頭",
    };
  }

  try {
    // 使用 LLM 幫助函數進行驗證
    // 該函數內部會使用提供的 API Key
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: "Say 'ok' in one word.",
        },
      ],
    });

    if (response && response.choices && response.choices.length > 0) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: "Google Gemini API 響應異常",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 根據錯誤訊息判斷具體原因
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("invalid_api_key")) {
      return {
        valid: false,
        error: "Google Gemini API Key 無效或已過期",
      };
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return {
        valid: false,
        error: "Google Gemini API 請求過於頻繁，請稍後再試",
      };
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      return {
        valid: false,
        error: "網路連接失敗，請檢查網路設定",
      };
    } else {
      return {
        valid: false,
        error: `Google Gemini API 驗證失敗：${errorMessage.substring(0, 100)}`,
      };
    }
  }
}

/**
 * 驗證 API Key（自動判斷類型）
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
  keyType?: "openai" | "gemini";
}> {
  if (!apiKey) {
    return {
      valid: false,
      error: "API Key 不能為空",
    };
  }

  // 判斷 Key 類型
  if (apiKey.startsWith("sk-")) {
    const result = await validateOpenaiKey(apiKey);
    return { ...result, keyType: "openai" };
  } else if (apiKey.startsWith("AIza")) {
    const result = await validateGeminiKey(apiKey);
    return { ...result, keyType: "gemini" };
  } else {
    return {
      valid: false,
      error: "無法識別的 API Key 格式（應以 'sk-' 或 'AIza' 開頭）",
    };
  }
}
