import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import {
  Loader2, Sparkles, Copy, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  CalendarDays, Trash2, Clock, Brain, Zap, Pencil, ClipboardCheck, Settings,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// 工具函數
// ============================================================

function getTodayDateStr(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = utc8.getUTCHours();
  if (hour < 7) utc8.setUTCDate(utc8.getUTCDate() - 1);
  return utc8.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd} (${weekdays[d.getDay()]})`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function parseNumbersFromText(text: string): number[] {
  const matches = text.match(/\d+/g);
  if (!matches) return [];
  const seen = new Set<number>();
  const result: number[] = [];
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (n >= 1 && n <= 80 && !seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result.slice(0, 6);
}

// ============================================================
// 長按 Hook
// ============================================================

function useLongPress(callback: () => void, ms: number = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setPressing(true);
    setProgress(0);
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / ms, 1));
    }, 50);
    timerRef.current = setTimeout(() => {
      callback();
      setPressing(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPressing(false);
    setProgress(0);
  }, []);

  return {
    pressing,
    progress,
    handlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
    },
  };
}

// ============================================================
// 黃金球組件
// ============================================================

function GoldenBall({ number, size = "md", isUserKey = false }: { number: number; size?: "xs" | "sm" | "md" | "lg"; isUserKey?: boolean }) {
  const sizeClasses =
    size === "xs" ? "w-4 h-4 text-[7px]" :
    size === "sm" ? "w-6 h-6 text-[9px]" :
    size === "lg" ? "w-12 h-12 text-base font-bold" :
    "w-9 h-9 text-xs";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-black shrink-0 relative",
        sizeClasses,
        isUserKey && "animate-pulse"
      )}
      style={{
        background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #d97706)",
        boxShadow: isUserKey
          ? "0 0 12px rgba(245, 158, 11, 0.6), 0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(239, 68, 68, 0.8)"
          : "0 0 12px rgba(245, 158, 11, 0.6), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {String(number).padStart(2, "0")}
      {isUserKey && (
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"
          style={{
            boxShadow: "0 0 8px rgba(239, 68, 68, 0.8)",
            animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// 即時數字分布矩陣
// ============================================================

function NumberDistributionBlock({
  dateStr,
  targetHour,
  goldenBalls,
}: {
  dateStr: string;
  targetHour: string | null;
  goldenBalls?: number[];
}) {
  const { data: draws, isLoading } = trpc.aiStar.getHourDraws.useQuery(
    { dateStr, targetHour: targetHour ?? "" },
    { enabled: !!targetHour, staleTime: 0, refetchInterval: 30000 }
  );

  if (!targetHour) return null;

  const displayDraws = draws || [];
  const hourPad = targetHour.padStart(2, "0");
  const goldenSet = new Set(goldenBalls ?? []);
  const NUMS = Array.from({ length: 80 }, (_, i) => i + 1);

  return (
    <Card className="border-border/30">
      <CardContent className="p-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-medium text-foreground">即時數字分布</span>
          <span className="text-[10px] text-muted-foreground">{hourPad}時 近15期</span>
          <div className="ml-auto flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-600/70" />
              <span className="text-muted-foreground">開出</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 ring-1 ring-emerald-300" />
              <span className="text-muted-foreground">預測球</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm border border-red-500" />
              <span className="text-muted-foreground">超級獎</span>
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="border-collapse" style={{ minWidth: `${80 * 13 + 20}px` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card text-[6px] text-muted-foreground/60 font-normal px-0 py-0.5 text-right border-r border-white/20 min-w-[20px]">時</th>
                  {NUMS.map(n => (
                    <th
                      key={n}
                      className={cn(
                        "text-[7px] font-mono font-normal text-center px-0 py-0.5 w-[13px] min-w-[13px] border-r border-b border-white/10",
                        goldenSet.has(n) ? "text-emerald-400 font-bold" : "text-muted-foreground/40"
                      )}
                    >
                      {String(n).padStart(2, "0")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...displayDraws].reverse().map((draw) => {
                  const isPending = draw.pending ?? false;
                  return (
                    <tr key={draw.term || draw.time} className={cn("border-t border-white/10", isPending && "opacity-50")}>
                      <td className={cn("sticky left-0 z-10 bg-card text-[6px] font-mono px-0 py-0.5 text-right border-r border-white/20 whitespace-nowrap", isPending ? "text-muted-foreground/30" : "text-muted-foreground/60")}>
                        {draw.time || "-"}
                      </td>
                      {NUMS.map(n => {
                        const isDrawn = !isPending && new Set(draw.numbers).has(n);
                        const isGolden = goldenSet.has(n);
                        const isSuperNumber = !isPending && (draw as { superNumber?: number }).superNumber === n;
                        return (
                          <td key={n} className={cn(
                            "text-center p-0 w-[13px] border-r border-b border-white/10",
                            isSuperNumber && "ring-1 ring-red-500 ring-inset"
                          )}>
                            {isDrawn ? (
                              <div
                                className={cn(
                                  "mx-auto my-0.5 w-2 h-2",
                                  isGolden
                                    ? "bg-emerald-400 ring-1 ring-emerald-300 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                                    : "bg-emerald-600/70"
                                )}
                              />
                            ) : isSuperNumber ? (
                              <div className="mx-auto my-0.5 w-2 h-2 border border-red-500/60 rounded-sm" />
                            ) : (
                              <div className="mx-auto my-0.5 w-2 h-2" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 驗證行組件
// ============================================================

function VerifyRow({ item }: {
  item: {
    term: string;
    index: number;
    time: string;
    hits: number[];
    isHit: boolean;
    superNumber?: number;
    isSuperHit?: boolean;
    pending?: boolean;
  }
}) {
  if (item.pending) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-border/10 bg-transparent opacity-40">
        <span className="font-mono text-muted-foreground/50 text-[9px] shrink-0 w-4 text-right">[{item.index}]</span>
        <span className="font-mono text-muted-foreground/50 text-[9px] shrink-0 w-9">{item.time}</span>
        <span className="text-[9px] text-muted-foreground/40 italic">未開獎</span>
      </div>
    );
  }

  const getSpecialEffect = () => {
    if (!item.isHit || item.hits.length < 3) return null;
    const hitCount = item.hits.length;
    if (hitCount >= 6) return <span className="text-purple-400 font-bold text-[9px] ml-1">【六星封神】</span>;
    if (hitCount >= 5) return <span className="text-yellow-400 font-bold text-[9px] ml-1">【五星滿貫】</span>;
    if (hitCount >= 4) return <span className="text-blue-400 font-bold text-[9px] ml-1">【四星報喜】</span>;
    if (hitCount >= 3) return <span className="text-amber-400 font-bold text-[9px] ml-1">【三星入袋】</span>;
    return null;
  };

  return (
    <div className={cn(
      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border overflow-x-auto scrollbar-none",
      item.isHit || item.isSuperHit ? "border-green-500/30 bg-green-500/5" : "border-border/20 bg-transparent"
    )}>
      <span className="font-mono text-muted-foreground/40 text-[9px] shrink-0 w-4 text-right">[{item.index}]</span>
      <span className="font-mono text-muted-foreground/60 text-[9px] shrink-0 w-9">{item.time}</span>
      <span className="font-mono text-muted-foreground/40 text-[9px] shrink-0">{item.term}</span>
      {/* 一般球驗證 */}
      <div className="flex items-center gap-0.5 min-w-0 flex-1">
        {item.isHit ? (
          <>
            {item.hits.map(n => (
              <span key={n} className="font-mono font-bold text-amber-400 text-[10px] shrink-0">
                {String(n).padStart(2, "0")}
              </span>
            ))}
            <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
            {getSpecialEffect()}
          </>
        ) : (
          <span className="text-muted-foreground/50 text-[9px]">未中獎</span>
        )}
      </div>
      {/* 超級獎驗證（並排） */}
      {item.superNumber !== undefined && item.superNumber > 0 && (
        <div className={cn(
          "flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded border text-[8px]",
          item.isSuperHit
            ? "border-red-500/40 bg-red-500/10"
            : "border-border/20 bg-transparent"
        )}>
          <span className="text-muted-foreground/40 text-[7px]">超</span>
          <span className={cn(
            "font-mono font-bold text-[9px]",
            item.isSuperHit ? "text-red-400" : "text-muted-foreground/50"
          )}>
            {String(item.superNumber).padStart(2, "0")}
          </span>
          {item.isSuperHit ? (
            <CheckCircle2 className="h-2.5 w-2.5 text-red-400 shrink-0" />
          ) : (
            <XCircle className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 時段卡片組件
// ============================================================

function SlotCard({
  slot,
  prediction,
  isCurrent,
  isSelected,
  onSelect,
  onDelete,
  dateStr,
  userApiKey,
}: {
  slot: { source: string; target: string; label: string; copyRange?: string; draws: number; verifyHour?: string; verifyRange?: string };
  prediction?: {
    goldenBalls: number[];
    reasoning: string | null;
    fullAnalysis?: string | null;
    isManual: boolean;
  };
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  dateStr: string;
  userApiKey?: { openaiKey: string | null; geminiKey: string | null };
}) {
  const [copied, setCopied] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  // 每個卡片複製的是 source 時段的數據（前一個時段）
  const { data: formattedData } = trpc.aiStar.getHourData.useQuery(
    { dateStr, sourceHour: slot.source, copyRange: slot.copyRange },
    { staleTime: 30000 }
  );
  
  // 查詢該時段（target）的即時開獎期數
  const targetHour = parseInt(slot.target);
  const { data: hourDraws } = trpc.draw.recent.useQuery(
    { limit: 200 },
    { staleTime: 10000 }
  );
  
  // 計算該時段的開獎期數
  const drawsInHour = hourDraws?.filter(draw => {
    const drawHour = parseInt(draw.drawTime.split(' ')[1].split(':')[0]);
    return drawHour === targetHour;
  }).length || 0;

  const handleCopy = useCallback(() => {
    if (formattedData?.text) {
      navigator.clipboard.writeText(formattedData.text).then(() => {
        setCopied(true);
        // 顯示卡片標籤（target 時段）
        toast.success(`已複製 ${slot.target}時 (${slot.copyRange || slot.source + "00~" + slot.source + "55"}) 數據`);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      toast.error("此時段尚無數據可複製");
    }
  }, [formattedData, slot.source, slot.target, slot.copyRange]);

  const longPress = useLongPress(handleCopy, 300);

  return (
    <div
      onClick={onSelect}
      {...longPress.handlers}
      className={cn(
        "relative cursor-pointer rounded transition-all select-none",
        isSelected
          ? "border-2 border-amber-400/60 bg-amber-400/10 ring-1 ring-amber-400/30 p-1 shadow-md"
          : prediction
            ? "border-2 border-green-500/40 bg-green-500/10 hover:border-green-500/60 p-1 shadow-sm"
            : drawsInHour > 0
              ? "border border-border/40 bg-secondary/30 hover:border-border/60 p-1 shadow-sm"
              : "border border-border/20 bg-secondary/10 hover:border-border/40 p-1"
      )}
    >
      {longPress.pressing && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-amber-400 rounded-b-lg transition-all"
          style={{ width: `${longPress.progress * 100}%` }}
        />
      )}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          <span className={cn(
            "font-mono text-[10px] font-medium",
            isCurrent ? "text-amber-400" : "text-foreground"
          )}>
            {slot.target.padStart(2, "0")}時
          </span>
          {isCurrent && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {prediction && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="h-3.5 w-3.5 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground/30 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
          <div className="relative flex items-center">
            {copied ? (
              <ClipboardCheck className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground/30" />
            )}
            {!prediction?.isManual && (userApiKey?.openaiKey || userApiKey?.geminiKey) && (
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 6px rgba(239, 68, 68, 0.8)" }} />
            )}
          </div>
        </div>
      </div>
      {prediction ? (
        <div className="flex items-center gap-0.5 justify-center flex-wrap">
          {prediction.goldenBalls.map((n, idx) => (
            <GoldenBall key={idx} number={n} size="xs" isUserKey={!prediction.isManual} />
          ))}
          <span className="text-[7px] text-muted-foreground/50 ml-0.5">
            {prediction.isManual ? "手動" : "AI"}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center py-0.5">
          <span className="text-[10px] text-muted-foreground/40">尚未分析</span>
        </div>
      )}
      <p className="text-[6px] text-muted-foreground/20 text-center mt-0.5">長按複製</p>
    </div>
  );
}

// API Key 設定面板已移到 @/components/ApiKeyPanel.tsx

// ============================================================
// 主組件
// ============================================================

export default function AiStarPage() {
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [dateStr, setDateStr] = useState(todayStr);
  const isToday = dateStr === todayStr;

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [verifySlot, setVerifySlot] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [parsedBalls, setParsedBalls] = useState<number[]>([]);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);

  // 查詢時段配置
  const { data: slotsData } = trpc.aiStar.getSlots.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // 查詢指定日期的所有預測
  const { data: predictions, refetch: refetchPredictions } = trpc.aiStar.getPredictions.useQuery(
    { dateStr },
    { staleTime: 0, refetchInterval: 30000 }
  );

  // 7天分析記錄
  const { data: analysisRecords } = trpc.aiStar.getAnalysisRecords.useQuery(
    { days: 7 },
    { enabled: showAnalysisHistory, staleTime: 60000 }
  );
  // 查詢用戶已儲存的 APIKey
  const { data: userApiKey, refetch: refetchApiKey } = trpc.aiStar.getApiKey.useQuery(undefined, {
    staleTime: 30000,
  });

  const slots = slotsData?.slots || [];
  const currentSlot = slotsData?.currentSlot;

  const effectiveSlot = selectedSlot || currentSlot?.hour || "15";
  const currentPrediction = predictions?.find(p => p.sourceHour === effectiveSlot);
  const currentSlotInfo = slots.find(s => s.source === effectiveSlot);

  // 驗證時段：每個卡片的黃金球在同時段驗證（verifyHour = target）
  // 14時卡片 → verifyHour="14" → 驗證 14:00~14:55（即時顯示已開獎結果）
  const effectiveVerifySlot = verifySlot || currentSlotInfo?.target || null;
  const verifySlotInfo = effectiveVerifySlot ? slots.find(s => s.target === effectiveVerifySlot) : null;
  const verifyPrediction = effectiveVerifySlot
    ? predictions?.find(p => p.targetHour === effectiveVerifySlot)
    : currentPrediction;

  // 驗證結果查詢：用 verifyHour（卡片顯示時段+1）查詢
  const actualVerifyHour = verifySlotInfo?.verifyHour || "";
  const { data: verifyResult } = trpc.aiStar.verify.useQuery(
    {
      dateStr,
      verifyHour: actualVerifyHour,
      goldenBalls: verifyPrediction?.goldenBalls || [],
    },
    {
      enabled: !!verifyPrediction && !!actualVerifyHour,
      staleTime: 0,
      refetchInterval: 30000,
    }
  );

  // AI 分析 mutation
  const analyzeMutation = trpc.aiStar.analyze.useMutation({
    onSuccess: (data) => {
      const keyType = data.usedLLM ? "用戶 APIKey" : "系統 Key";
      toast.success(`${data.sourceHour}時段 AI 分析完成 (${keyType})，推薦 ${data.goldenBalls.length} 顆黃金球`);
      refetchPredictions();
    },
    onError: (err) => {
      toast.error(`AI 分析失敗：${err.message}`);
    },
  });

  // 批量分析 mutation
  const batchAnalyzeMutation = trpc.aiStar.batchAnalyze.useMutation({
    onSuccess: (data) => {
      toast.success(`批量分析完成！成功 ${data.success}/${data.total} 個時段`);
      refetchPredictions();
    },
    onError: (err) => {
      toast.error(`批量分析失敗：${err.message}`);
    },
  });

  // 手動儲存 mutation
  const saveManualMutation = trpc.aiStar.saveManual.useMutation({
    onSuccess: () => {
      toast.success("黃金球號碼已儲存");
      setManualText("");
      setParsedBalls([]);
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
    { dateStr, sourceHour: effectiveSlot, copyRange: currentSlotInfo?.copyRange },
    { staleTime: 30000 }
  );

  // 解析手動輸入
  const handleManualTextChange = (text: string) => {
    setManualText(text);
    setParsedBalls(parseNumbersFromText(text));
  };

  const handleManualSubmit = () => {
    if (!effectiveSlot || parsedBalls.length === 0) return;
    saveManualMutation.mutate({
      dateStr,
      sourceHour: effectiveSlot,
      goldenBalls: parsedBalls,
    });
  };

  const handleCopyData = () => {
    if (hourDataForCopy?.text) {
      navigator.clipboard.writeText(hourDataForCopy.text);
      toast.success("數據已複製，可貼到 AI 工具分析");
    }
  };

  if (!slotsData) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* ── 標題 & 日期切換 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-foreground">AI 一星策略</span>
            </div>
            {/* 日期切換 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setDateStr(prev => shiftDate(prev, -1))}
                className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/40 border border-border/20 min-w-[80px] justify-center">
                <CalendarDays className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-mono text-foreground">
                  {formatDateDisplay(dateStr)}
                </span>
              </div>
              <button
                onClick={() => { if (!isToday) setDateStr(prev => shiftDate(prev, 1)); }}
                disabled={isToday}
                className={cn(
                  "p-0.5 rounded transition-colors",
                  isToday
                    ? "text-muted-foreground/20 cursor-not-allowed"
                    : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                )}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {!isToday && (
                <button
                  onClick={() => setDateStr(todayStr)}
                  className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  今日
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/60">
              選擇時段 → AI 分析 → 驗證命中 · 長按卡片可複製數據
            </p>
            <button
              onClick={() => setShowApiKeyPanel(!showApiKeyPanel)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400 transition-colors"
            >
              <Settings className="h-3 w-3" />
              API Key
            </button>
          </div>
        </CardContent>
      </Card>

      {/* API Key 設定面板 */}
      {showApiKeyPanel && <ApiKeyPanel onClose={() => setShowApiKeyPanel(false)} />}

      {/* ── 時段總覽網格 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-foreground shrink-0">各時段總覽</span>
            <span className="text-[10px] text-muted-foreground">
              {predictions?.length || 0} 個已分析
            </span>
            <div className="ml-auto flex items-center gap-1">
              <a
                href="https://gemini.google.com/app/a35bb8c4886f6949"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-colors shrink-0 no-underline"
              >
                <Brain className="h-3 w-3" />
                <span>AI手動計算</span>
              </a>
              <button
                onClick={() => batchAnalyzeMutation.mutate({ dateStr })}
                disabled={batchAnalyzeMutation.isPending}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-colors shrink-0"
              >
                {batchAnalyzeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>一鍵全部分析</span>
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`確定清除 ${dateStr} 所有時段的球號？此操作無法撤銷。`)) return;
                  try {
                    if (predictions && predictions.length > 0) {
                      await Promise.all(
                        predictions.map(pred =>
                          deleteMutation.mutateAsync({ dateStr, sourceHour: pred.sourceHour })
                        )
                      );
                    }
                    setManualText("");
                    setParsedBalls([]);
                    setSelectedSlot(null);
                    setVerifySlot(null);
                    toast.success(`已清除所有時段球號`);
                  } catch {
                    toast.error("清除失敗");
                  }
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-colors shrink-0"
              >
                <Trash2 className="h-3 w-3" />
                <span>清除全部</span>
              </button>
            </div>
          </div>

          {/* 批量分析進度提示 */}
          {batchAnalyzeMutation.isPending && (
            <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                <span className="text-[10px] text-amber-400">正在批量分析所有時段，請稍候...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {slots.map(slot => {
              const pred = predictions?.find(p => p.sourceHour === slot.source);
              // isCurrent: 當前時間對應的卡片（比對 target 時段）
              const isCurrent = currentSlot?.hour === slot.target;
              const isSelected = effectiveSlot === slot.source;
              return (
                <SlotCard
                  key={slot.source}
                  slot={slot}
                  prediction={pred}
                  isCurrent={isCurrent}
                  isSelected={isSelected}
                  userApiKey={userApiKey}
                  onSelect={() => {
                    setSelectedSlot(slot.source);
                    if (slot.target) setVerifySlot(slot.target);
                  }}
                  onDelete={pred ? async () => {
                    try {
                      await deleteMutation.mutateAsync({ dateStr, sourceHour: slot.source });
                      toast.success(`已清除 ${slot.source.padStart(2, "0")}時段球號`);
                    } catch {
                      toast.error("清除失敗");
                    }
                  } : undefined}
                  dateStr={dateStr}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 選中時段 黃金球展示 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-foreground">
                {currentSlotInfo?.target.padStart(2, "0") || effectiveSlot.padStart(2, "0")}時 黃金球
                {currentPrediction && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    ({currentPrediction.isManual ? "手動" : "AI"} · {currentPrediction.goldenBalls.length}顆)
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              {hourDataForCopy?.text && (
                <button
                  onClick={handleCopyData}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  複製數據
                </button>
              )}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeMutation.mutate({ dateStr, sourceHour: effectiveSlot })}
                  disabled={analyzeMutation.isPending}
                  className="gap-1 border border-amber-500 text-xs px-2 py-1 h-7 hover:bg-amber-500/10 font-semibold"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Brain className="h-3 w-3" />
                  )}
                  AI分析
                </Button>
                {currentPrediction && !currentPrediction.isManual && (userApiKey?.openaiKey || userApiKey?.geminiKey) && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 8px rgba(239, 68, 68, 0.8)" }} />
                )}
              </div>
            </div>
          </div>

          {/* 黃金球展示 */}
          {currentPrediction ? (
            <div className="space-y-1.5">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-secondary/30 border-2 border-amber-500">
                  {currentPrediction.goldenBalls.map((num: number, idx: number) => (
                    <GoldenBall key={idx} number={num} size="lg" />
                  ))}
                </div>
              </div>
              {currentPrediction.reasoning && (
                <details className="w-full">
                  <summary className="cursor-pointer text-[10px] text-amber-400/70 hover:text-amber-400 text-center px-2 py-1 rounded hover:bg-amber-500/5 transition-colors">
                    📋 AI 分析推理說明
                  </summary>
                  <div className="mt-2 p-2.5 rounded bg-secondary/30 border border-amber-500/20">
                    <p className="text-[9px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {currentPrediction.reasoning}
                    </p>
                  </div>
                </details>
              )}
              <p className="text-[10px] text-muted-foreground/50 text-center">
                數據 {currentSlotInfo?.copyRange || (effectiveSlot.padStart(2, "0") + "00~" + effectiveSlot.padStart(2, "0") + "55")} → 預測 {currentSlotInfo?.target.padStart(2, "0") || "??"}:00~{currentSlotInfo?.target.padStart(2, "0") || "??"}:55
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-secondary/30 border border-amber-500/20 border-dashed animate-pulse">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-[10px] text-muted-foreground">?</div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                尚未分析此時段，點擊「AI分析」或在下方手動輸入
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 手動輸入 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pencil className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-foreground">
              手動輸入（{currentSlotInfo?.target.padStart(2, "0") || effectiveSlot.padStart(2, "0")}時）
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">1~6 顆球</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder="輸入號碼，例如：10 22 33 55 88 99"
              value={manualText}
              onChange={e => handleManualTextChange(e.target.value)}
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              onClick={handleManualSubmit}
              disabled={saveManualMutation.isPending || parsedBalls.length < 1}
              className="h-7 text-[10px] px-2.5 bg-amber-500 hover:bg-amber-600 text-black shrink-0"
            >
              {saveManualMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : "驗證"}
            </Button>
          </div>
          {parsedBalls.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground shrink-0">解析：</span>
              <div className="flex items-center gap-1 flex-wrap">
                {parsedBalls.map((n, idx) => (
                  <GoldenBall key={idx} number={n} size="sm" />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {parsedBalls.length} 顆
              </span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            支援格式：直接數字、逗號分隔、或含文字（自動去除文字保留數字）
          </p>
        </CardContent>
      </Card>

      {/* ── 即時數字分布矩陣 ── */}
      {currentSlot?.hour && (
        <NumberDistributionBlock
          dateStr={dateStr}
          targetHour={currentSlot.hour}
          goldenBalls={parsedBalls.length > 0 ? parsedBalls : currentPrediction?.goldenBalls}
        />
      )}

      {/* ── 驗證結果 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-medium text-foreground">驗證結果</span>
              <span className="text-[10px] text-muted-foreground font-mono">{formatDateDisplay(dateStr)}</span>
            </div>
          </div>

          {/* 驗證時段選擇：顯示「卡片時段 → 驗證時段」 */}
          <div className="mb-2">
            <p className="text-[10px] text-muted-foreground mb-1">選擇驗證時段（即時驗證同時段開獎結果）：</p>
            <div className="flex gap-0 overflow-x-auto scrollbar-none border-b border-border/20">
              {slots.map(slot => {
                const pred = predictions?.find(p => p.targetHour === slot.target);
                const isVerifySelected = effectiveVerifySlot === slot.target;
                return (
                  <button
                    key={slot.target}
                    onClick={() => setVerifySlot(slot.target)}
                    disabled={!pred}
                    className={cn(
                      "shrink-0 py-1 px-1.5 text-center text-[10px] font-mono transition-all border-b-2 flex flex-col items-center",
                      isVerifySelected
                        ? "border-green-400 text-green-400 bg-green-400/10"
                        : pred
                          ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
                          : "border-transparent text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    {/* 顯示卡片時段（target = verifyHour，即時驗證同時段） */}
                    <span>{slot.target.padStart(2, "0")}時</span>
                    <span className="text-[7px] opacity-60">{slot.verifyRange?.replace("~", "-") || ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 驗證結果列表 */}
          {verifyResult && verifyResult.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">號碼：</span>
                  {verifyPrediction?.goldenBalls.map((n: number) => (
                    <GoldenBall key={n} number={n} size="sm" />
                  ))}
                  {actualVerifyHour && (
                    <span className="text-[9px] text-amber-400/70 font-mono ml-1">→ {actualVerifyHour.padStart(2, "0")}:00~{actualVerifyHour.padStart(2, "0")}:55</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    命中 <span className="font-bold text-green-400">
                      {verifyResult.filter((v) => v.isHit).length}
                    </span>/{verifyResult.filter((v) => !v.pending).length} 期
                    {verifyResult.some((v) => v.pending) && (
                      <span className="text-muted-foreground/40 ml-1">(待開{verifyResult.filter((v) => v.pending).length}期)</span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      const opened = verifyResult.filter((v) => !v.pending);
                      const hitCount = opened.filter((v) => v.isHit).length;
                      const balls = verifyPrediction?.goldenBalls.map((n: number) => String(n).padStart(2, "0")).join(" ") || "";
                      const rate = opened.length > 0 ? Math.round(hitCount / opened.length * 100) : 0;
                      const text = `驗證結果 號碼：${balls}\n命中 ${hitCount}/${opened.length} 期（命中率：${rate}%）\n已開${opened.length}/12期，待開${verifyResult.filter((v) => v.pending).length}期`;
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
                  <VerifyRow key={item.time} item={{ ...item, index: idx + 1 }} />
                ))}
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center justify-center gap-3 text-[10px]">
                {(() => {
                  const opened = verifyResult.filter((v) => !v.pending);
                  const hitCount = opened.filter((v) => v.isHit).length;
                  const rate = opened.length > 0 ? Math.round(hitCount / opened.length * 100) : 0;
                  return (
                    <>
                      <span className="text-green-400">
                        命中率：{rate}%
                      </span>
                      <span className="text-muted-foreground">
                        總命中球數：{verifyResult.reduce((sum, v) => sum + v.hits.length, 0)}
                      </span>
                      <span className="text-muted-foreground/50">
                        已開{opened.length}/12期
                      </span>
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-3">
              <XCircle className="h-4 w-4 text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground/50">
                {effectiveVerifySlot
                  ? `${effectiveVerifySlot}時卡片尚無預測資料，或${verifySlotInfo?.verifyRange || ""}開獎資料尚未入庫`
                  : "請先選擇驗證時段"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 7天分析記錄 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <button
            onClick={() => setShowAnalysisHistory(!showAnalysisHistory)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-foreground">7天分析記錄</span>
            </div>
            <ChevronRight className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              showAnalysisHistory && "rotate-90"
            )} />
          </button>

          {showAnalysisHistory && (
            <div className="mt-2 space-y-1">
              {analysisRecords ? (
                analysisRecords.map(record => (
                  <div
                    key={record.dateStr}
                    className="flex items-center justify-between py-1 px-1.5 rounded bg-secondary/20"
                  >
                    <span className="text-[10px] font-mono text-foreground">
                      {formatDateDisplay(record.dateStr)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {record.analyzedSlots}/{record.totalSlots} 時段
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-secondary/50">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(record.analyzedSlots / record.totalSlots) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 免責聲明 */}
      <p className="text-[10px] text-muted-foreground/40 text-center px-4">
        AI 一星策略僅供參考，彩票開獎具有隨機性，請理性娛樂，切勿沉迷。
      </p>
    </div>
  );
}
