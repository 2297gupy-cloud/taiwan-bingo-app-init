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
    // 直接調用 OpenAI API 驗證 Key
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Say 'ok' in one word.",
          },
        ],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401) {
      return {
        valid: false,
        error: "OpenAI API Key 無效或已過期",
      };
    } else if (response.status === 429) {
      return {
        valid: false,
        error: "OpenAI API 請求過於頻繁，請稍後再試",
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: `OpenAI API 驗證失敗 (${response.status}): ${errorData.error?.message || "未知錯誤"}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
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
    // 直接調用 Gemini API 驗證 Key
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "user",
            content: "Say 'ok' in one word.",
          },
        ],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        error: "Google Gemini API Key 無效或已過期",
      };
    } else if (response.status === 429) {
      return {
        valid: false,
        error: "Google Gemini API 請求過於頻繁，請稍後再試",
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: `Google Gemini API 驗證失敗 (${response.status}): ${errorData.error?.message || "未知錯誤"}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
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
