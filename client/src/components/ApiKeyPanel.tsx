import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, ChevronDown, ChevronUp, Key, CheckCircle2, Trash2, RefreshCw, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyPanelProps {
  onClose: () => void;
  title?: string;
}

/**
 * 重新設計的 API Key 設定面板
 * - 單一輸入框，自動識別 Key 類型（sk- / AIza- / 其他）
 * - 可選填 Base URL 和模型名稱（第三方代理用）
 * - 已儲存 Key 顯示「更換」和「刪除」按鈕
 * - 驗證通過後才顯示紅色閃爍小球
 * - 為每個 AI 服務提供「如何取得？」連結
 */
export function ApiKeyPanel({ onClose, title = "AI API Key 設定" }: ApiKeyPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 載入已儲存的 Key 狀態
  const { data: savedKeys, isLoading: loadingKeys, refetch: refetchKeys } = trpc.aiStar.getApiKey.useQuery(undefined, {
    retry: false,
  });

  const saveKey = trpc.aiStar.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("✅ API Key 已驗證並儲存成功");
      setIsEditing(false);
      setApiKey("");
      setBaseUrl("");
      setModelName("");
      refetchKeys();
    },
    onError: (err) => {
      toast.error(`❌ ${err.message || "API Key 驗證或儲存失敗"}`);
    },
  });

  // 判斷 Key 類型
  const detectKeyType = (key: string): string => {
    if (!key) return "";
    if (key.startsWith("sk-ant-api")) return "Claude (Anthropic)";
    if (key.startsWith("sk-")) return "OpenAI / Monica / DeepSeek";
    if (key.startsWith("AIza")) return "Google Gemini";
    return "未知格式";
  };

  // 獲取文檔連結
  const getDocumentationLink = (key: string): { service: string; url: string } | null => {
    if (!key) return null;
    if (key.startsWith("sk-ant-api")) {
      return { service: "Claude", url: "https://platform.claude.com/docs/en/api/admin/api_keys/retrieve" };
    }
    if (key.startsWith("sk-")) {
      return { service: "OpenAI", url: "https://platform.openai.com/account/api-keys" };
    }
    if (key.startsWith("AIza")) {
      return { service: "Google Gemini", url: "https://aistudio.google.com/app/apikey" };
    }
    return null;
  };

  // 已儲存的 Key（優先顯示 openaiKey，其次 geminiKey）
  const savedKey = savedKeys?.openaiKey || savedKeys?.geminiKey || null;
  const savedKeyType = savedKeys?.openaiKey
    ? (savedKeys.openaiKey?.startsWith("sk-ant-api") ? "Claude (Anthropic)" : (savedKeys.customBaseUrl ? "第三方代理" : "OpenAI / Monica / DeepSeek"))
    : savedKeys?.geminiKey ? "Google Gemini" : null;
  const hasKey = !!savedKey;

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("請輸入 API Key");
      return;
    }
    // 根據 Key 格式決定儲存到哪個欄位
    if (apiKey.startsWith("AIza")) {
      saveKey.mutate({
        openaiKey: "",
        geminiKey: apiKey.trim(),
        customBaseUrl: baseUrl.trim() || "",
        customModel: modelName.trim() || "",
      });
    } else {
      saveKey.mutate({
        openaiKey: apiKey.trim(),
        geminiKey: "",
        customBaseUrl: baseUrl.trim() || "",
        customModel: modelName.trim() || "",
      });
    }
  };

  const handleDelete = () => {
    saveKey.mutate({
      openaiKey: "",
      geminiKey: "",
      customBaseUrl: "",
      customModel: "",
    });
    toast.info("API Key 已刪除");
  };

  const handleReplace = () => {
    setIsEditing(true);
    setShowAdvanced(!!savedKeys?.customBaseUrl);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setApiKey("");
    setBaseUrl("");
    setModelName("");
  };

  const keyType = detectKeyType(apiKey);
  const docLink = getDocumentationLink(apiKey);

  return (
    <Card className="border-amber-500/30 bg-card">
      <CardContent className="p-3">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">{title}</span>
            {hasKey && !isEditing && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 6px rgba(239,68,68,0.8)" }} />
                <span className="text-[10px] text-green-400">已啟用</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>

        {loadingKeys ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          </div>
        ) : (
          <div className="space-y-3">

            {/* ── 已儲存 Key 顯示 ── */}
            {hasKey && !isEditing ? (
              <div className="space-y-2">
                {/* Key 狀態卡片 */}
                <div className="p-2.5 rounded-lg border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <span className="text-[11px] text-green-400 font-semibold">API Key 已驗證儲存</span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                      {savedKeyType}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate px-1">
                    {savedKey}
                  </div>
                  {savedKeys?.customBaseUrl && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/20 space-y-0.5">
                      <div className="text-[10px] text-muted-foreground/70 truncate">
                        <span className="text-blue-400">Base URL：</span>{savedKeys.customBaseUrl}
                      </div>
                      {savedKeys.customModel && (
                        <div className="text-[10px] text-muted-foreground/70">
                          <span className="text-blue-400">模型：</span>{savedKeys.customModel}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 更換 / 刪除按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReplace}
                    className="flex-1 h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <RefreshCw className="h-3 w-3" />
                    更換 Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={saveKey.isPending}
                    className="flex-1 h-8 text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {saveKey.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    刪除 Key
                  </Button>
                </div>
              </div>
            ) : (
              /* ── 輸入新 Key ── */
              <div className="space-y-2">
                {/* 單一 Key 輸入框 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      API Key
                    </div>
                    {apiKey && (
                      <span className="text-[10px] text-muted-foreground">
                        識別為：<span className="text-amber-400">{keyType}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="輸入 sk-... 或 sk-ant-api... 或 AIza..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-9 text-xs font-mono flex-1"
                      autoFocus
                    />
                    {docLink && (
                      <a
                        href={docLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-2 rounded text-[10px] text-blue-400 hover:bg-blue-500/10 transition-colors whitespace-nowrap"
                        title={`如何取得 ${docLink.service} API Key`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="hidden sm:inline">如何取得？</span>
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    支援 ChatGPT、Claude、Gemini、Monica、DeepSeek 等
                  </p>
                </div>

                {/* 進階設定：第三方代理 */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-400 transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <Zap className="h-3 w-3" />
                    第三方代理設定（選填）
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-2 p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5">
                      <p className="text-[10px] text-blue-400/80">
                        用於 Monica、DeepSeek 等第三方代理服務。設定後，Key 將通過自訂端點發送請求。
                      </p>
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-1">API Base URL</div>
                        <Input
                          type="text"
                          placeholder="https://api.vectorengine.ai/v1"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-1">模型名稱</div>
                        <Input
                          type="text"
                          placeholder="gemini-2.0-flash-lite"
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 保存 / 取消按鈕 */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={!apiKey.trim() || saveKey.isPending}
                    className="flex-1 h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                  >
                    {saveKey.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {saveKey.isPending ? "驗證中..." : "保存"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
