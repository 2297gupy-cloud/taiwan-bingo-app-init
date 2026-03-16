import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyPanelProps {
  onClose: () => void;
  title?: string;
  description?: string;
}

/**
 * 共用的 API Key 設定面板元件
 * 支持 OpenAI 和 Gemini Key 的設定、更換、清除
 * 支持第三方 API 代理服務（自訂 Base URL 和模型名稱）
 * 用於 AiStarPage 和 AiSuperPrizePage
 */
export function ApiKeyPanel({
  onClose,
  title = "AI API Key 設定",
  description = "API Key 加密儲存於伺服器。若已儲存，AI 分析將優先使用您的 Key；未儲存則使用系統內建 Key。"
}: ApiKeyPanelProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [editingOpenai, setEditingOpenai] = useState(false);
  const [editingGemini, setEditingGemini] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 載入已儲存的 Key 狀態
  const { data: savedKeys, isLoading: loadingKeys, refetch: refetchKeys } = trpc.aiStar.getApiKey.useQuery(undefined, {
    retry: false,
  });

  const saveKey = trpc.aiStar.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("API Key 已驗證並儲存成功");
      setEditingOpenai(false);
      setEditingGemini(false);
      setOpenaiKey("");
      setGeminiKey("");
      refetchKeys();
    },
    onError: (err) => {
      const errorMessage = err.message || "API Key 驗證或儲存失敗";
      toast.error(errorMessage);
    },
  });

  const clearOpenai = () => saveKey.mutate({ openaiKey: "", geminiKey: undefined });
  const clearGemini = () => saveKey.mutate({ openaiKey: undefined, geminiKey: "" });
  const clearCustomSettings = () => saveKey.mutate({
    openaiKey: undefined,
    geminiKey: undefined,
    customBaseUrl: "",
    customModel: "",
  });

  const handleSave = () => {
    saveKey.mutate({
      openaiKey: openaiKey || undefined,
      geminiKey: geminiKey || undefined,
      customBaseUrl: customBaseUrl || undefined,
      customModel: customModel || undefined,
    });
  };

  const hasInput = openaiKey || geminiKey || customBaseUrl || customModel;

  return (
    <Card className="border-amber-500/30 bg-card">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
        {loadingKeys ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* OpenAI Key */}
            <div>
              <div className="text-xs font-semibold text-amber-400 mb-1">OpenAI Key (sk-...)</div>
              {savedKeys?.openaiKey && !editingOpenai ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-8 px-2 rounded border border-green-500/30 bg-green-500/10 flex items-center gap-1.5 overflow-hidden">
                    <span className="text-[10px] text-green-400 shrink-0">✓ 已儲存</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">{savedKeys.openaiKey}</span>
                  </div>
                  <button onClick={() => setEditingOpenai(true)}
                    className="h-8 px-2 text-[10px] rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors shrink-0">更換</button>
                  <button onClick={clearOpenai} disabled={saveKey.isPending}
                    className="h-8 px-2 text-[10px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors shrink-0">清除</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input type="password" placeholder="sk-..." value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="h-8 text-xs flex-1" autoFocus={editingOpenai} />
                  {editingOpenai && (
                    <button onClick={() => { setEditingOpenai(false); setOpenaiKey(""); }}
                      className="h-8 px-2 text-[10px] rounded border border-border/30 text-muted-foreground hover:text-foreground transition-colors shrink-0">取消</button>
                  )}
                </div>
              )}
            </div>

            {/* Gemini Key */}
            <div>
              <div className="text-xs font-semibold text-amber-400 mb-1">Google Gemini Key (AIza...)</div>
              {savedKeys?.geminiKey && !editingGemini ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-8 px-2 rounded border border-green-500/30 bg-green-500/10 flex items-center gap-1.5 overflow-hidden">
                    <span className="text-[10px] text-green-400 shrink-0">✓ 已儲存</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">{savedKeys.geminiKey}</span>
                  </div>
                  <button onClick={() => setEditingGemini(true)}
                    className="h-8 px-2 text-[10px] rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors shrink-0">更換</button>
                  <button onClick={clearGemini} disabled={saveKey.isPending}
                    className="h-8 px-2 text-[10px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors shrink-0">清除</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input type="password" placeholder="AIza..." value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="h-8 text-xs flex-1" autoFocus={editingGemini} />
                  {editingGemini && (
                    <button onClick={() => { setEditingGemini(false); setGeminiKey(""); }}
                      className="h-8 px-2 text-[10px] rounded border border-border/30 text-muted-foreground hover:text-foreground transition-colors shrink-0">取消</button>
                  )}
                </div>
              )}
            </div>

            {/* 進階設定：第三方 API 代理 */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                進階設定（第三方 API 代理）
              </button>

              {showAdvanced && (
                <div className="mt-2 space-y-2 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                  <p className="text-[10px] text-amber-400/80">
                    支援向量引擎等 OpenAI 相容格式的第三方代理服務。設定後，API Key 將通過自訂端點發送請求。
                  </p>

                  {/* API Base URL */}
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                      API Base URL（選填）
                    </div>
                    {savedKeys?.customBaseUrl && !customBaseUrl ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-7 px-2 rounded border border-blue-500/30 bg-blue-500/10 flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[10px] text-blue-400 shrink-0">✓</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{savedKeys.customBaseUrl}</span>
                        </div>
                        <button
                          onClick={clearCustomSettings}
                          disabled={saveKey.isPending}
                          className="h-7 px-2 text-[10px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        >清除</button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="https://api.vectorengine.ai/v1"
                        value={customBaseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>

                  {/* 模型名稱 */}
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                      模型名稱（選填）
                    </div>
                    {savedKeys?.customModel && !customModel ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-7 px-2 rounded border border-blue-500/30 bg-blue-500/10 flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[10px] text-blue-400 shrink-0">✓</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{savedKeys.customModel}</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="gemini-2.0-flash-lite"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground/50">
                    範例：向量引擎 Base URL = https://api.vectorengine.ai/v1，模型 = gemini-2.0-flash-lite
                  </p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/60">
              {description}
            </p>

            {hasInput && (
              <Button size="sm"
                onClick={handleSave}
                disabled={saveKey.isPending}
                className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black">
                {saveKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "驗證並儲存設定"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
