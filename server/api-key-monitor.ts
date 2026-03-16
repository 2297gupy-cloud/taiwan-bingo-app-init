import { validateApiKey } from "./api-key-validator";
import { notifyOwner } from "./_core/notification";

/**
 * API Key 監控狀態
 */
export interface ApiKeyStatus {
  userId: string;
  apiKeyType: "openai" | "gemini";
  isValid: boolean;
  lastCheckedAt: number;
  lastValidAt?: number;
  errorMessage?: string;
  notificationSent: boolean;
}

/**
 * 檢查單個用戶的 API Key 有效性
 * 注：簡化版本，實際使用時需要從數據庫獲取用戶 API Key
 */
export async function checkUserApiKey(userId: string, apiKey: string): Promise<ApiKeyStatus> {
  try {
    if (!apiKey) {
      return {
        userId,
        apiKeyType: "openai",
        isValid: false,
        lastCheckedAt: Date.now(),
        errorMessage: "未設定 API Key",
        notificationSent: false,
      };
    }

    const now = Date.now();
    const result = await validateApiKey(apiKey);

    return {
      userId,
      apiKeyType: apiKey.startsWith("sk-") ? "openai" : "gemini",
      isValid: result.valid,
      lastCheckedAt: now,
      lastValidAt: result.valid ? now : undefined,
      errorMessage: result.error,
      notificationSent: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      userId,
      apiKeyType: "openai",
      isValid: false,
      lastCheckedAt: Date.now(),
      errorMessage: `檢查失敗：${errorMessage.substring(0, 100)}`,
      notificationSent: false,
    };
  }
}

/**
 * 手動檢查用戶 API Key（用於前端按需檢查）
 */
export async function manualCheckUserApiKey(apiKey: string): Promise<{
  isValid: boolean;
  errorMessage?: string;
}> {
  const result = await validateApiKey(apiKey);
  return {
    isValid: result.valid,
    errorMessage: result.error,
  };
}

/**
 * 定期檢查任務（每 6 小時執行一次）
 * 注：實際使用時需要集成到後端服務中
 */
export async function startApiKeyMonitoringTask(): Promise<void> {
  console.log("[ApiKeyMonitor] API Key 監控任務已初始化");
  // 實際實現需要從數據庫獲取所有用戶的 API Key 並檢查
}
