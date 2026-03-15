import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, CheckCircle2, XCircle, ChevronRight, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 黃金球組件
function GoldenBall({ number, size = "md" }: { number: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg font-bold",
  }[size];

  return (
    <div
      className={cn(
        sizeClass,
        "rounded-full flex items-center justify-center font-bold shrink-0",
        "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500",
        "text-black shadow-lg border-2 border-amber-300",
        "ring-2 ring-amber-400/50"
      )}
    >
      {String(number).padStart(2, "0")}
    </div>
  );
}

// 時段卡片組件
function SlotCard({
  slot,
  prediction,
  isCurrentSource,
  onAnalyze,
  onSelect,
  isSelected,
  isAnalyzing,
}: {
  slot: { source: string; target: string; label: string };
  prediction?: { goldenBalls: number[]; isManual: boolean; reasoning?: string | null };
  isCurrentSource: boolean;
  onAnalyze: () => void;
  onSelect: () => void;
  isSelected: boolean;
  isAnalyzing: boolean;
}) {
  const hasPrediction = prediction && prediction.goldenBalls.length > 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative rounded-lg border p-2 cursor-pointer transition-all",
        isSelected
          ? "border-amber-400 bg-amber-400/10 shadow-amber-400/20 shadow-md"
          : hasPrediction
            ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/50"
            : "border-border/30 bg-card/50 hover:border-border/60",
        isCurrentSource && "ring-1 ring-blue-400/50"
      )}
    >
      {/* 時段標題 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          "text-xs font-bold font-mono",
          isCurrentSource ? "text-blue-400" : "text-foreground/80"
        )}>
          {slot.source}時
          {isCurrentSource && <span className="ml-1 text-[9px] text-blue-400 animate-pulse">●</span>}
        </span>
        {hasPrediction && (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1 py-0 h-4",
              prediction.isManual
                ? "border-blue-400/50 text-blue-400"
                : "border-amber-400/50 text-amber-400"
            )}
          >
            {prediction.isManual ? "手動" : "AI"}
          </Badge>
        )}
      </div>

      {/* 黃金球展示 */}
      {hasPrediction ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {prediction.goldenBalls.map((n) => (
            <GoldenBall key={n} number={n} size="sm" />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-8">
          <button
            onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
            disabled={isAnalyzing}
            className="text-[10px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI分析
          </button>
        </div>
      )}
    </div>
  );
}

// 數字分布矩陣
function NumberMatrix({
  draws,
  goldenBalls,
}: {
  draws: { numbers: number[] }[];
  goldenBalls: number[];
}) {
  // 計算各號碼出現頻率
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) freq[i] = 0;
  for (const draw of draws) {
    for (const n of draw.numbers) {
      freq[n] = (freq[n] || 0) + 1;
    }
  }

  const maxFreq = Math.max(...Object.values(freq));
  const goldenSet = new Set(goldenBalls);

  return (
    <div className="grid grid-cols-10 gap-0.5">
      {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
        const count = freq[n] || 0;
        const intensity = maxFreq > 0 ? count / maxFreq : 0;
        const isGolden = goldenSet.has(n);

        return (
          <div
            key={n}
            className={cn(
              "aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono transition-all",
              isGolden
                ? "bg-amber-400 text-black font-bold ring-1 ring-amber-300"
                : intensity > 0.7
                  ? "bg-red-500/70 text-white"
                  : intensity > 0.4
                    ? "bg-orange-400/60 text-white"
                    : intensity > 0.1
                      ? "bg-blue-400/40 text-foreground"
                      : "bg-muted/30 text-muted-foreground/50"
            )}
          >
            {String(n).padStart(2, "0")}
          </div>
        );
      })}
    </div>
  );
}

// API Key 設定面板
function ApiKeyPanel({ onClose }: { onClose: () => void }) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const saveKey = trpc.aiStar.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("API Key 已儲存");
      onClose();
    },
    onError: () => toast.error("請先登入才能儲存 API Key"),
  });

  return (
    <Card className="border-amber-500/30 bg-card">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">AI API Key 設定</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">OpenAI API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Gemini API Key</label>
            <Input
              type="password"
              placeholder="AIza..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            API Key 加密儲存於伺服器，用於 AI 智能分析功能。
          </p>
          <Button
            size="sm"
            onClick={() => saveKey.mutate({ openaiKey: openaiKey || undefined, geminiKey: geminiKey || undefined })}
            disabled={saveKey.isPending || (!openaiKey && !geminiKey)}
            className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black"
          >
            {saveKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "儲存 API Key"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AiStarPage() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [analyzingSlot, setAnalyzingSlot] = useState<string | null>(null);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [verifySlot, setVerifySlot] = useState<string | null>(null);

  // 查詢時段配置
  const { data: slotsData } = trpc.aiStar.getSlots.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // 查詢今日預測
  const { data: predictions, refetch: refetchPredictions } = trpc.aiStar.getPredictions.useQuery(
    { dateStr: slotsData?.dateStr },
    { enabled: !!slotsData?.dateStr, refetchInterval: 30000 }
  );

  // 取得當前選中時段的預測
  const currentPrediction = useMemo(() => {
    if (!selectedSlot || !predictions) return null;
    return predictions.find((p) => p.sourceHour === selectedSlot) || null;
  }, [selectedSlot, predictions]);

  // 取得當前時段的開獎數據
  const effectiveTargetHour = useMemo(() => {
    if (!selectedSlot || !slotsData) return null;
    const slot = slotsData.slots.find((s) => s.source === selectedSlot);
    return slot?.target || null;
  }, [selectedSlot, slotsData]);

  const { data: hourDraws } = trpc.aiStar.getHourDraws.useQuery(
    { dateStr: slotsData?.dateStr, targetHour: effectiveTargetHour || "" },
    { enabled: !!effectiveTargetHour && !!slotsData?.dateStr }
  );

  // 取得驗證時段的預測
  const verifyPrediction = useMemo(() => {
    if (!verifySlot || !predictions) return null;
    return predictions.find((p) => p.sourceHour === verifySlot) || null;
  }, [verifySlot, predictions]);

  const effectiveVerifyTarget = useMemo(() => {
    if (!verifySlot || !slotsData) return null;
    const slot = slotsData.slots.find((s) => s.source === verifySlot);
    return slot?.target || null;
  }, [verifySlot, slotsData]);

  const { data: verifyResult } = trpc.aiStar.verify.useQuery(
    {
      dateStr: slotsData?.dateStr,
      targetHour: effectiveVerifyTarget || "",
      goldenBalls: verifyPrediction?.goldenBalls || [],
    },
    { enabled: !!verifyPrediction && !!effectiveVerifyTarget }
  );

  // AI 分析 mutation
  const analyzeMutation = trpc.aiStar.analyze.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.sourceHour}時段 AI 分析完成，推薦 ${data.goldenBalls.length} 顆黃金球`);
      refetchPredictions();
      setAnalyzingSlot(null);
    },
    onError: () => {
      toast.error("AI 分析失敗");
      setAnalyzingSlot(null);
    },
  });

  // 手動儲存 mutation
  const saveManualMutation = trpc.aiStar.saveManual.useMutation({
    onSuccess: () => {
      toast.success("黃金球號碼已儲存");
      setManualInput("");
      refetchPredictions();
    },
    onError: () => toast.error("儲存失敗"),
  });

  // 刪除預測 mutation
  const deleteMutation = trpc.aiStar.deletePrediction.useMutation({
    onSuccess: () => {
      toast.success("預測已刪除");
      refetchPredictions();
    },
  });

  // 取得格式化時段數據（用於複製）
  const { data: hourDataForCopy } = trpc.aiStar.getHourData.useQuery(
    { dateStr: slotsData?.dateStr, sourceHour: selectedSlot || "" },
    { enabled: !!selectedSlot }
  );

  // 解析手動輸入
  const parsedBalls = useMemo(() => {
    const nums = manualInput.match(/\d+/g)?.map(Number).filter((n) => n >= 1 && n <= 80) || [];
    const unique: number[] = [];
    for (const n of nums) {
      if (!unique.includes(n)) unique.push(n);
    }
    return unique.slice(0, 10);
  }, [manualInput]);

  const handleAnalyze = (sourceHour: string) => {
    setAnalyzingSlot(sourceHour);
    analyzeMutation.mutate({ dateStr: slotsData?.dateStr, sourceHour });
  };

  const handleManualSave = () => {
    if (!selectedSlot || parsedBalls.length === 0) return;
    saveManualMutation.mutate({
      dateStr: slotsData?.dateStr,
      sourceHour: selectedSlot,
      goldenBalls: parsedBalls,
    });
  };

  const handleCopyData = () => {
    if (hourDataForCopy?.text) {
      navigator.clipboard.writeText(hourDataForCopy.text);
      toast.success("數據已複製，可貼到 AI 工具分析");
    }
  };

  const currentHour = slotsData?.currentSlot?.hour || "";

  if (!slotsData) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI 一星策略
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {slotsData.dateStr} · 今日 {predictions?.length || 0}/{slotsData.slots.length} 時段已分析
          </p>
        </div>
        <button
          onClick={() => setShowApiKeyPanel(!showApiKeyPanel)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-400 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          API Key
        </button>
      </div>

      {/* API Key 設定面板 */}
      {showApiKeyPanel && <ApiKeyPanel onClose={() => setShowApiKeyPanel(false)} />}

      {/* 時段總覽網格 */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">各時段總覽</span>
            <button
              onClick={() => {
                slotsData.slots.forEach((slot, idx) => {
                  setTimeout(() => handleAnalyze(slot.source), idx * 200);
                });
              }}
              className="text-[10px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              一鍵全部分析
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {slotsData.slots.map((slot) => {
              const pred = predictions?.find((p) => p.sourceHour === slot.source);
              return (
                <SlotCard
                  key={slot.source}
                  slot={slot}
                  prediction={pred}
                  isCurrentSource={slot.source === currentHour}
                  onAnalyze={() => handleAnalyze(slot.source)}
                  onSelect={() => setSelectedSlot(slot.source === selectedSlot ? null : slot.source)}
                  isSelected={selectedSlot === slot.source}
                  isAnalyzing={analyzingSlot === slot.source}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 選中時段詳情 */}
      {selectedSlot && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-amber-400">
                {selectedSlot}時段詳情
              </span>
              <div className="flex items-center gap-2">
                {hourDataForCopy?.text && (
                  <button
                    onClick={handleCopyData}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400"
                  >
                    <Copy className="h-3 w-3" />
                    複製數據
                  </button>
                )}
                {currentPrediction && (
                  <button
                    onClick={() => deleteMutation.mutate({ dateStr: slotsData.dateStr, sourceHour: selectedSlot })}
                    className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    刪除
                  </button>
                )}
              </div>
            </div>

            {/* 當前預測黃金球 */}
            {currentPrediction ? (
              <div className="mb-3">
                <p className="text-[11px] text-muted-foreground mb-2">
                  推薦黃金球 ({currentPrediction.isManual ? "手動輸入" : "AI 分析"})
                </p>
                <div className="flex gap-2 flex-wrap">
                  {currentPrediction.goldenBalls.map((n) => (
                    <GoldenBall key={n} number={n} size="lg" />
                  ))}
                </div>
                {currentPrediction.reasoning && (
                  <p className="text-[10px] text-muted-foreground/70 mt-2">{currentPrediction.reasoning}</p>
                )}
              </div>
            ) : (
              <div className="mb-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAnalyze(selectedSlot)}
                  disabled={analyzingSlot === selectedSlot}
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {analyzingSlot === selectedSlot ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  AI 自動分析
                </Button>
                <span className="text-[10px] text-muted-foreground">或手動輸入號碼</span>
              </div>
            )}

            {/* 手動輸入 */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">手動輸入黃金球號碼：</p>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入號碼，如：07 14 21 28 35 42"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleManualSave}
                  disabled={parsedBalls.length === 0 || saveManualMutation.isPending}
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                >
                  {saveManualMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "儲存"}
                </Button>
              </div>
              {parsedBalls.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">解析：</span>
                  <div className="flex gap-1 flex-wrap">
                    {parsedBalls.map((n) => (
                      <GoldenBall key={n} number={n} size="sm" />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">{parsedBalls.length} 顆</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/40">支援格式：直接數字、逗號分隔、或含文字（自動去除文字保留數字）</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 數字分布矩陣 */}
      {selectedSlot && hourDraws && hourDraws.length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">數字分布矩陣</span>
              <span className="text-[10px] text-muted-foreground">近 {hourDraws.length} 期 · {selectedSlot}時段</span>
            </div>
            <NumberMatrix
              draws={hourDraws}
              goldenBalls={currentPrediction?.goldenBalls || []}
            />
            <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 黃金球</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/70 inline-block" /> 高頻</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400/40 inline-block" /> 低頻</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 驗證結果 */}
      <Card className="border-border/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-medium">驗證結果</span>
          </div>

          {/* 驗證時段選擇 */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none border-b border-border/20 mb-2">
            {slotsData.slots.map((slot) => {
              const pred = predictions?.find((p) => p.sourceHour === slot.source);
              const isSelected = verifySlot === slot.source;
              return (
                <button
                  key={slot.source}
                  onClick={() => setVerifySlot(slot.source)}
                  disabled={!pred}
                  className={cn(
                    "shrink-0 py-1 px-1.5 text-center text-[10px] font-mono transition-all border-b-2",
                    isSelected
                      ? "border-green-400 text-green-400 bg-green-400/10"
                      : pred
                        ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
                        : "border-transparent text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {slot.source}時
                </button>
              );
            })}
          </div>

          {/* 驗證結果列表 */}
          {verifyResult && verifyResult.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">號碼：</span>
                  {verifyPrediction?.goldenBalls.map((n) => (
                    <GoldenBall key={n} number={n} size="sm" />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    命中 <span className="font-bold text-green-400">
                      {verifyResult.filter((v) => v.isHit).length}
                    </span>/{verifyResult.length} 期
                  </span>
                  <button
                    onClick={() => {
                      const hitCount = verifyResult.filter((v) => v.isHit).length;
                      const balls = verifyPrediction?.goldenBalls.map((n) => String(n).padStart(2, "0")).join(" ") || "";
                      const text = `驗證結果 號碼：${balls}\n命中 ${hitCount}/${verifyResult.length} 期（命中率：${Math.round(hitCount / verifyResult.length * 100)}%）`;
                      navigator.clipboard.writeText(text);
                      toast.success("驗證結果已複製");
                    }}
                    className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60 hover:text-amber-400"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                {verifyResult.map((item, idx) => (
                  <div
                    key={item.term || idx}
                    className={cn(
                      "flex items-center justify-between py-0.5 px-1.5 rounded text-[10px]",
                      item.isHit ? "bg-green-500/10" : "bg-transparent"
                    )}
                  >
                    <span className="font-mono text-muted-foreground">[{item.index}] {item.time}</span>
                    {item.isHit ? (
                      <div className="flex items-center gap-1">
                        {item.hits.map((n) => (
                          <span key={n} className="text-green-400 font-bold">{String(n).padStart(2, "0")}</span>
                        ))}
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">未中獎</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center justify-center gap-3 text-[10px]">
                <span className="text-green-400">
                  命中率：{Math.round(verifyResult.filter((v) => v.isHit).length / verifyResult.length * 100)}%
                </span>
                <span className="text-muted-foreground">
                  總命中球數：{verifyResult.reduce((sum, v) => sum + v.hits.length, 0)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-3">
              <XCircle className="h-4 w-4 text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground/50">
                {verifySlot ? `${verifySlot}時段尚無預測資料或開獎資料` : "請先選擇驗證時段"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 免責聲明 */}
      <p className="text-[10px] text-muted-foreground/40 text-center px-4">
        ⚠️ AI 一星策略僅供參考，彩票開獎具有隨機性，請理性娛樂，切勿沉迷。
      </p>
    </div>
  );
}
