import { useState, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Sparkles, Copy, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  CalendarDays, Trash2, Clock, Brain, Zap, Pencil, ClipboardCheck, BarChart3
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
  return result.slice(0, 10);
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
// 超級獎球組件（紅色主題）
// ============================================================
function SuperBall({ number, size = "md" }: { number: number; size?: "xs" | "sm" | "md" | "lg" }) {
  const sizeClasses =
    size === "xs" ? "w-4 h-4 text-[7px]" :
    size === "sm" ? "w-6 h-6 text-[9px]" :
    size === "lg" ? "w-10 h-10 text-sm font-bold" :
    "w-8 h-8 text-xs";
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold text-white shrink-0",
        sizeClasses
      )}
      style={{
        background: "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444, #b91c1c)",
        boxShadow: "0 0 10px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {String(number).padStart(2, "0")}
    </div>
  );
}

// ============================================================
// 即時數字分布矩陣（含超級獎紅框）
// ============================================================
function SuperNumberDistributionBlock({
  dateStr,
  targetHour,
  candidateBalls,
}: {
  dateStr: string;
  targetHour: string | null;
  candidateBalls?: number[];
}) {
  const { data: draws, isLoading } = trpc.aiStar.getHourDrawsWithSuper.useQuery(
    { dateStr, targetHour: targetHour ?? "" },
    { enabled: !!targetHour, staleTime: 0, refetchInterval: 30000 }
  );
  if (!targetHour) return null;
  const displayDraws = draws || [];
  const hourPad = targetHour.padStart(2, "0");
  const candidateSet = new Set(candidateBalls ?? []);
  const NUMS = Array.from({ length: 80 }, (_, i) => i + 1);
  return (
    <Card className="border-border/30">
      <CardContent className="p-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs font-medium text-foreground">即時數字分布</span>
          <span className="text-[10px] text-muted-foreground">{hourPad}時 近15期</span>
          <div className="ml-auto flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-600/70" />
              <span className="text-muted-foreground">開出</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm border border-red-400 bg-red-500/30" />
              <span className="text-muted-foreground">超級獎球</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="inline-block w-2 h-2 rounded-sm bg-red-500 ring-1 ring-red-300" />
              <span className="text-muted-foreground">預測球</span>
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
                        candidateSet.has(n) ? "text-red-400 font-bold" : "text-muted-foreground/40"
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
                  const superNum = (draw as { superNumber?: number }).superNumber;
                  return (
                    <tr key={draw.term || draw.time} className={cn("border-t border-white/10", isPending && "opacity-50")}>
                      <td className={cn("sticky left-0 z-10 bg-card text-[6px] font-mono px-0 py-0.5 text-right border-r border-white/20 whitespace-nowrap", isPending ? "text-muted-foreground/30" : "text-muted-foreground/60")}>
                        {draw.time || "-"}
                      </td>
                      {NUMS.map(n => {
                        const isDrawn = !isPending && new Set(draw.numbers).has(n);
                        const isCandidate = candidateSet.has(n);
                        const isSuperNumber = !isPending && superNum === n;
                        return (
                          <td key={n} className={cn(
                            "text-center p-0 w-[13px] border-r border-b border-white/10",
                            isSuperNumber && "ring-1 ring-red-500 ring-inset"
                          )}>
                            {isDrawn ? (
                              <div
                                className={cn(
                                  "mx-auto my-0.5 w-2 h-2",
                                  isCandidate
                                    ? "bg-red-500 ring-1 ring-red-300 shadow-[0_0_4px_rgba(239,68,68,0.8)]"
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
// 超級獎驗證行組件
// ============================================================
function SuperVerifyRow({ item }: {
  item: {
    term: string;
    index: number;
    time: string;
    superNumber: number;
    isHit: boolean;
    normalHits?: number[];
    normalHitCount?: number;
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
  const hitCount = item.normalHitCount ?? 0;
  const hasNormalHit = hitCount > 0;
  return (
    <div className={cn(
      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border overflow-x-auto scrollbar-none",
      item.isHit ? "border-red-500/30 bg-red-500/5" : hasNormalHit ? "border-amber-500/20 bg-amber-500/5" : "border-border/20 bg-transparent"
    )}>
      <span className="font-mono text-muted-foreground/40 text-[9px] shrink-0 w-4 text-right">[{item.index}]</span>
      <span className="font-mono text-muted-foreground/60 text-[9px] shrink-0 w-9">{item.time}</span>
      <span className="font-mono text-muted-foreground/40 text-[9px] shrink-0">{item.term}</span>
      {/* 一般球命中 */}
      <div className={cn(
        "flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded border text-[8px]",
        hasNormalHit ? "border-amber-500/30 bg-amber-500/10" : "border-border/20 bg-transparent"
      )}>
        <span className="text-muted-foreground/40 text-[7px]">一般</span>
        <span className={cn(
          "font-mono font-bold text-[9px]",
          hasNormalHit ? "text-amber-400" : "text-muted-foreground/40"
        )}>
          {hitCount}顆
        </span>
        {hasNormalHit ? (
          <CheckCircle2 className="h-2.5 w-2.5 text-amber-400 shrink-0" />
        ) : (
          <XCircle className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
        )}
      </div>
      {/* 分隔線 */}
      <span className="text-muted-foreground/20 text-[9px] shrink-0">|</span>
      {/* 超級獎驗證 */}
      <div className={cn(
        "flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded border text-[8px]",
        item.isHit ? "border-red-500/40 bg-red-500/10" : "border-border/20 bg-transparent"
      )}>
        <span className="text-muted-foreground/40 text-[7px]">超</span>
        <span className={cn(
          "font-mono font-bold text-[9px]",
          item.isHit ? "text-red-400" : "text-muted-foreground/50"
        )}>
          {item.superNumber > 0 ? String(item.superNumber).padStart(2, "0") : "?"}
        </span>
        {item.isHit ? (
          <CheckCircle2 className="h-2.5 w-2.5 text-red-400 shrink-0" />
        ) : (
          <XCircle className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// 時段卡片組件（超級獎版）
// ============================================================
function SuperSlotCard({
  slot,
  prediction,
  isCurrent,
  isSelected,
  onSelect,
  onDelete,
  dateStr,
}: {
  slot: { source: string; target: string; label: string; copyRange?: string; draws: number; verifyHour?: string; verifyRange?: string };
  prediction?: {
    candidateBalls: number[];
    reasoning: string | null;
    isManual: boolean;
  };
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  dateStr: string;
}) {
  const [copied, setCopied] = useState(false);
  const { data: formattedData } = trpc.aiSuperPrize.getHourData.useQuery(
    { dateStr, sourceHour: slot.source, copyRange: slot.copyRange },
    { staleTime: 30000 }
  );
  const handleCopy = useCallback(() => {
    if (formattedData?.text) {
      navigator.clipboard.writeText(formattedData.text).then(() => {
        setCopied(true);
        toast.success(`已複製 ${slot.target}時 超級獎數據`);
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
        "relative cursor-pointer rounded border p-1 transition-all select-none",
        isSelected
          ? "border-red-400/60 bg-red-400/10 ring-1 ring-red-400/30"
          : prediction
            ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
            : "border-border/20 bg-secondary/20 hover:border-border/40"
      )}
    >
      {longPress.pressing && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-red-400 rounded-b-lg transition-all"
          style={{ width: `${longPress.progress * 100}%` }}
        />
      )}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          <span className={cn(
            "font-mono text-[10px] font-medium",
            isCurrent ? "text-red-400" : "text-foreground"
          )}>
            {slot.target.padStart(2, "0")}時
          </span>
          {isCurrent && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
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
          {copied ? (
            <ClipboardCheck className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground/30" />
          )}
        </div>
      </div>
      {prediction ? (
        <div className="flex items-center gap-0.5 justify-center flex-wrap">
          {prediction.candidateBalls.slice(0, 5).map((n, idx) => (
            <SuperBall key={idx} number={n} size="xs" />
          ))}
          {prediction.candidateBalls.length > 5 && (
            <span className="text-[7px] text-red-400/60">+{prediction.candidateBalls.length - 5}</span>
          )}
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

// ============================================================
// 主組件
// ============================================================
export default function AiSuperPrizePage() {
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [dateStr, setDateStr] = useState(todayStr);
  const isToday = dateStr === todayStr;
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [verifySlot, setVerifySlot] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [parsedBalls, setParsedBalls] = useState<number[]>([]);

  // 查詢時段配置
  const { data: slotsData } = trpc.aiSuperPrize.getSlots.useQuery(undefined, {
    refetchInterval: 30000,
  });
  // 查詢指定日期的所有超級獎預測
  const { data: predictions, refetch: refetchPredictions } = trpc.aiSuperPrize.getPredictions.useQuery(
    { dateStr },
    { staleTime: 0, refetchInterval: 30000 }
  );

  const slots = slotsData?.slots || [];
  const currentSlot = slotsData?.currentSlot;
  const effectiveSlot = selectedSlot || currentSlot?.hour || "15";
  const currentPrediction = predictions?.find(p => p.sourceHour === effectiveSlot);
  const currentSlotInfo = slots.find(s => s.source === effectiveSlot);

  const effectiveVerifySlot = verifySlot || currentSlotInfo?.target || null;
  const verifySlotInfo = effectiveVerifySlot ? slots.find(s => s.target === effectiveVerifySlot) : null;
  const verifyPrediction = effectiveVerifySlot
    ? predictions?.find(p => p.targetHour === effectiveVerifySlot)
    : currentPrediction;

  const actualVerifyHour = verifySlotInfo?.verifyHour || "";

  // 驗證結果查詢
  const { data: verifyResult } = trpc.aiSuperPrize.verify.useQuery(
    {
      dateStr,
      verifyHour: actualVerifyHour,
      candidateBalls: verifyPrediction?.candidateBalls || [],
    },
    {
      enabled: !!verifyPrediction && !!actualVerifyHour,
      staleTime: 0,
      refetchInterval: 30000,
    }
  );

  // AI 分析 mutation
  const analyzeMutation = trpc.aiSuperPrize.analyze.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.sourceHour}時段 AI 分析完成，推薦 ${data.candidateBalls.length} 顆超級獎候選球`);
      refetchPredictions();
    },
    onError: (err) => {
      toast.error(`AI 分析失敗：${err.message}`);
    },
  });

  // 手動儲存 mutation
  const saveManualMutation = trpc.aiSuperPrize.saveManual.useMutation({
    onSuccess: () => {
      toast.success("超級獎候選球已儲存");
      setManualText("");
      setParsedBalls([]);
      refetchPredictions();
    },
    onError: () => toast.error("儲存失敗"),
  });

  // 刪除預測 mutation
  const deleteMutation = trpc.aiSuperPrize.deletePrediction.useMutation({
    onSuccess: () => {
      toast.success("預測已刪除");
      refetchPredictions();
    },
  });

  // 取得格式化時段數據（用於複製）
  const { data: hourDataForCopy } = trpc.aiSuperPrize.getHourData.useQuery(
    { dateStr, sourceHour: effectiveSlot, copyRange: currentSlotInfo?.copyRange },
    { staleTime: 30000 }
  );

  const handleManualTextChange = (text: string) => {
    setManualText(text);
    setParsedBalls(parseNumbersFromText(text));
  };

  const handleManualSubmit = () => {
    if (parsedBalls.length < 1) {
      toast.error("請輸入至少 1 個號碼（1-80）");
      return;
    }
    saveManualMutation.mutate({
      dateStr,
      sourceHour: effectiveSlot,
      targetHour: currentSlotInfo?.target || effectiveSlot,
      candidateBalls: parsedBalls,
    });
  };

  const handleCopyData = useCallback(() => {
    if (hourDataForCopy?.text) {
      navigator.clipboard.writeText(hourDataForCopy.text).then(() => {
        toast.success("超級獎數據已複製");
      });
    }
  }, [hourDataForCopy]);

  return (
    <div className="space-y-3 pb-8">
      {/* ── 標題 ── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "radial-gradient(circle at 35% 35%, #fca5a5, #ef4444, #b91c1c)" }}>
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">AI 超級獎</h2>
            <p className="text-[9px] text-muted-foreground">分析超級獎號碼規律，推薦10顆候選球</p>
          </div>
        </div>
        {/* 日期切換 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDateStr(shiftDate(dateStr, -1))}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary/80 text-muted-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/30">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-foreground">{formatDateDisplay(dateStr)}</span>
            {isToday && <span className="text-[8px] text-red-400 font-medium">今</span>}
          </div>
          <button
            onClick={() => {
              if (!isToday) setDateStr(shiftDate(dateStr, 1));
            }}
            disabled={isToday}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary/80 text-muted-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── 時段卡片列表 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-medium text-foreground">時段選擇</span>
            <span className="text-[10px] text-muted-foreground ml-auto">點擊切換時段</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {slots.map((slot) => {
              const pred = predictions?.find(p => p.sourceHour === slot.source);
              const isCurrent = currentSlot?.hour === slot.target;
              const isSelected = effectiveSlot === slot.source;
              return (
                <SuperSlotCard
                  key={slot.source}
                  slot={slot}
                  prediction={pred}
                  isCurrent={isCurrent}
                  isSelected={isSelected}
                  onSelect={() => {
                    setSelectedSlot(slot.source);
                    setVerifySlot(slot.target);
                  }}
                  onDelete={pred ? () => deleteMutation.mutate({ dateStr, sourceHour: slot.source }) : undefined}
                  dateStr={dateStr}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 選中時段 超級獎候選球展示 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-medium text-foreground">
                {currentSlotInfo?.target.padStart(2, "0") || effectiveSlot.padStart(2, "0")}時 超級獎候選球
                {currentPrediction && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    ({currentPrediction.isManual ? "手動" : "AI"} · {currentPrediction.candidateBalls.length}顆)
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              {hourDataForCopy?.text && (
                <button
                  onClick={handleCopyData}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  複製數據
                </button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeMutation.mutate({
                  dateStr,
                  sourceHour: effectiveSlot,
                  targetHour: currentSlotInfo?.target || effectiveSlot,
                })}
                disabled={analyzeMutation.isPending}
                className="gap-1 border border-red-500 text-xs px-2 py-1 h-7 hover:bg-red-500/10 font-semibold"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Brain className="h-3 w-3" />
                )}
                AI分析
              </Button>
            </div>
          </div>
          {/* 超級獎候選球展示（10顆緊排） */}
          {currentPrediction ? (
            <div className="space-y-1.5">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/30 border-2 border-red-500 flex-wrap justify-center">
                  {currentPrediction.candidateBalls.map((num: number, idx: number) => (
                    <SuperBall key={idx} number={num} size="md" />
                  ))}
                </div>
              </div>
              {currentPrediction.reasoning && (
                <p className="text-[10px] text-muted-foreground/70 text-center px-2">
                  {currentPrediction.reasoning}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/50 text-center">
                數據 {currentSlotInfo?.copyRange || (effectiveSlot.padStart(2, "0") + "00~" + effectiveSlot.padStart(2, "0") + "55")} → 預測 {currentSlotInfo?.target.padStart(2, "0") || "??"}:00~{currentSlotInfo?.target.padStart(2, "0") || "??"}:55
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/30 border border-red-500/20 border-dashed animate-pulse flex-wrap justify-center">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-[9px] text-muted-foreground">?</div>
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
            <Pencil className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-medium text-foreground">
              手動輸入（{currentSlotInfo?.target.padStart(2, "0") || effectiveSlot.padStart(2, "0")}時）
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">最多 10 顆球</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder="輸入超級獎候選號碼，例如：7 14 21 28 35 42 49 56 63 70"
              value={manualText}
              onChange={e => handleManualTextChange(e.target.value)}
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              onClick={handleManualSubmit}
              disabled={saveManualMutation.isPending || parsedBalls.length < 1}
              className="h-7 text-[10px] px-2.5 bg-red-500 hover:bg-red-600 text-white shrink-0"
            >
              {saveManualMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : "儲存"}
            </Button>
          </div>
          {parsedBalls.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="text-[9px] text-muted-foreground">預覽：</span>
              {parsedBalls.map((n, idx) => (
                <SuperBall key={idx} number={n} size="xs" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 即時數字分布矩陣 ── */}
      {currentSlotInfo?.target && (
        <SuperNumberDistributionBlock
          dateStr={dateStr}
          targetHour={currentSlotInfo.target}
          candidateBalls={parsedBalls.length > 0 ? parsedBalls : currentPrediction?.candidateBalls}
        />
      )}

      {/* ── 驗證結果 ── */}
      <Card className="border-border/30">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-medium text-foreground">超級獎驗證</span>
          </div>
          {/* 驗證時段選擇 */}
          <div className="mb-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {slots.map((slot) => (
                <button
                  key={slot.target}
                  onClick={() => setVerifySlot(slot.target)}
                  className={cn(
                    "flex flex-col items-center px-1.5 py-0.5 rounded border text-[9px] whitespace-nowrap shrink-0 transition-colors",
                    effectiveVerifySlot === slot.target
                      ? "border-red-400/60 bg-red-400/10 text-red-400"
                      : "border-border/20 text-muted-foreground hover:border-red-400/30"
                  )}
                >
                  <span>{slot.target.padStart(2, "0")}時</span>
                  <span className="text-[7px] opacity-60">{slot.verifyRange?.replace("~", "-") || ""}</span>
                </button>
              ))}
            </div>
          </div>
          {/* 驗證結果列表 */}
          {verifyResult && verifyResult.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">候選球：</span>
                  {verifyPrediction?.candidateBalls.slice(0, 5).map((n: number) => (
                    <SuperBall key={n} number={n} size="xs" />
                  ))}
                  {(verifyPrediction?.candidateBalls.length ?? 0) > 5 && (
                    <span className="text-[8px] text-red-400/60">+{(verifyPrediction?.candidateBalls.length ?? 0) - 5}</span>
                  )}
                  {actualVerifyHour && (
                    <span className="text-[9px] text-red-400/70 font-mono ml-1">→ {actualVerifyHour.padStart(2, "0")}:00~{actualVerifyHour.padStart(2, "0")}:55</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    命中 <span className="font-bold text-red-400">
                      {verifyResult.filter((v) => v.isHit).length}
                    </span>/{verifyResult.filter((v) => !v.pending).length} 期
                  </span>
                </div>
              </div>
              <div className="space-y-0.5">
                {verifyResult.map((item, idx) => (
                  <SuperVerifyRow key={item.time} item={{ ...item, index: idx + 1 }} />
                ))}
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center justify-center gap-3 text-[10px]">
                {(() => {
                  const opened = verifyResult.filter((v) => !v.pending);
                  const hitCount = opened.filter((v) => v.isHit).length;
                  const rate = opened.length > 0 ? Math.round(hitCount / opened.length * 100) : 0;
                  return (
                    <>
                      <span className="text-red-400">命中率：{rate}%</span>
                      <span className="text-muted-foreground">已開{opened.length}/12期</span>
                      {verifyResult.some(v => v.pending) && (
                        <span className="text-muted-foreground/50">待開{verifyResult.filter(v => v.pending).length}期</span>
                      )}
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
                  ? `${effectiveVerifySlot}時卡片尚無超級獎預測資料`
                  : "請先選擇驗證時段"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 免責聲明 */}
      <p className="text-[10px] text-muted-foreground/40 text-center px-4">
        AI 超級獎策略僅供參考，彩票開獎具有隨機性，請理性娛樂，切勿沉迷。
      </p>
    </div>
  );
}
