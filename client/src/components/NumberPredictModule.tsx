/**
 * 🔮 號碼預測模組
 * 參考 bingo-predictor.zeabur.app 設計
 * 支援：5種策略、分析區間、選號數量、自選球號
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Shuffle, Target, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Strategy = "hot" | "cold" | "balanced" | "weighted" | "overdue";

const STRATEGIES: {
  key: Strategy;
  emoji: string;
  name: string;
  desc: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "hot",
    emoji: "🔥",
    name: "追熱策略",
    desc: "選近期出現頻率最高的號碼，跟隨熱門趨勢",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/40",
  },
  {
    key: "cold",
    emoji: "🧊",
    name: "補冷策略",
    desc: "選久未出現、統計上可能補位的冷門號碼",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
  },
  {
    key: "balanced",
    emoji: "⚖️",
    name: "均衡策略",
    desc: "混合熱號與冷號，分散風險、提高覆蓋率",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/40",
  },
  {
    key: "weighted",
    emoji: "🎲",
    name: "加權隨機",
    desc: "依歷史頻率加權隨機選取，模擬機率分布",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
  },
  {
    key: "overdue",
    emoji: "⏳",
    name: "到期策略",
    desc: "選連續最久未出現的號碼，補漏理論",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/40",
  },

];

const PERIOD_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 球號顏色（參考賓果設計）
function getBallColor(num: number): string {
  if (num <= 20) return "from-amber-400 to-amber-600";
  if (num <= 40) return "from-blue-400 to-blue-600";
  if (num <= 60) return "from-rose-400 to-rose-600";
  return "from-emerald-400 to-emerald-600";
}

function PredictBall({ number, size = "md", animate = false }: { number: number; size?: "sm" | "md" | "lg"; animate?: boolean }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg font-bold" : "w-10 h-10 text-sm font-semibold";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold shadow-lg shrink-0",
        `bg-gradient-to-br ${getBallColor(number)}`,
        sizeClass,
        animate && "animate-bounce"
      )}
      style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)" }}
    >
      {String(number).padStart(2, "0")}
    </div>
  );
}



export default function NumberPredictModule() {
  const [strategy, setStrategy] = useState<Strategy>("weighted");
  const [periods, setPeriods] = useState(5);
  const [count, setCount] = useState(5);

  const [copied, setCopied] = useState(false);
  const [animating, setAnimating] = useState(false);

  const predictMutation = trpc.numberPredict.predict.useMutation({
    onSuccess: () => {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 1500);
    },
    onError: (err) => toast.error(`預測失敗：${err.message}`),
  });

  const { data: statsData } = trpc.numberPredict.stats.useQuery(
    { periods },
    { staleTime: 30000 }
  );

  const selectedStrategy = STRATEGIES.find(s => s.key === strategy)!;

  const handlePredict = () => {
    predictMutation.mutate({
      strategy,
      periods,
      count,
    });
  };

  const handleCopy = () => {
    if (!predictMutation.data) return;
    const nums = predictMutation.data.numbers.map(n => String(n).padStart(2, "0")).join(" · ");
    navigator.clipboard.writeText(nums);
    setCopied(true);
    toast.success("號碼已複製！");
    setTimeout(() => setCopied(false), 2000);
  };

  const result = predictMutation.data;

  return (
    <div className="space-y-3">
      {/* 分析區間 */}
      <div className="p-3 rounded-xl bg-card border border-border/40">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📊</span>
          <span className="text-xs font-semibold text-foreground">分析區間</span>
          <span className="text-[10px] text-muted-foreground ml-auto">分析最近 {periods} 期開獎</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => setPeriods(p)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border",
                periods === p
                  ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                  : "bg-secondary/30 border-border/30 text-muted-foreground hover:border-indigo-400/50 hover:text-indigo-300"
              )}
            >
              {p} 期
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1.5">
          選擇較少期數可觀察近期趨勢，較多期數可分析長期分布
        </p>
      </div>

      {/* 選擇預測策略 */}
      <div className="p-3 rounded-xl bg-card border border-border/40">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🎯</span>
          <span className="text-xs font-semibold text-foreground">選擇預測策略</span>
        </div>
        <div className="space-y-2">
          {STRATEGIES.map(s => (
            <button
              key={s.key}
              onClick={() => setStrategy(s.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all text-left",
                strategy === s.key
                  ? `${s.bgColor} ${s.borderColor} shadow-md`
                  : "bg-secondary/30 border-border/40 hover:bg-secondary/50 hover:border-border/60"
              )}
            >
              <span className="text-base shrink-0">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[11px] font-semibold", strategy === s.key ? s.color : "text-foreground")}>
                  {s.name}
                </p>
                <p className="text-[9px] text-muted-foreground truncate">{s.desc}</p>
              </div>
              {strategy === s.key && (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", s.bgColor, s.borderColor, "border")}>
                  <Check className={cn("h-3 w-3", s.color)} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 自選球號格（只在 custom 策略時顯示） */}


      {/* 選號數量 */}
      <div className="p-3 rounded-xl bg-card border border-border/40">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🔢</span>
          <span className="text-xs font-semibold text-foreground">選號數量</span>
          <span className="text-[10px] text-amber-400 ml-auto font-bold">{count}星</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {COUNT_OPTIONS.map(c => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                count === c
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  : "bg-secondary/30 border-border/30 text-muted-foreground hover:border-amber-400/50 hover:text-amber-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1.5">
          賓果賓果每期可選 1~10 個號碼，選愈多覆蓋率愈高但彩金分級不同
        </p>
      </div>

      {/* 熱號冷號參考 */}
      {statsData && (
        <div className="p-3 rounded-xl bg-card border border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">📈</span>
            <span className="text-xs font-semibold text-foreground">近 {periods} 期參考</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-[9px] text-orange-400 font-semibold mb-1">🔥 熱號 TOP 5</p>
              <div className="flex flex-wrap gap-1">
                {statsData.hotNumbers.slice(0, 5).map(n => (
                  <span key={n} className="text-[10px] font-mono font-bold text-orange-300 bg-orange-500/20 px-1 rounded">
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-[9px] text-blue-400 font-semibold mb-1">🧊 冷號 TOP 5</p>
              <div className="flex flex-wrap gap-1">
                {statsData.coldNumbers.slice(0, 5).map(n => (
                  <span key={n} className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 px-1 rounded">
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 開始預測按鈕 */}
      <button
        onClick={handlePredict}
        disabled={predictMutation.isPending}
        className={cn(
          "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
          "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100",
          "shadow-[0_4px_20px_rgba(139,92,246,0.4)]"
        )}
      >
        {predictMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>分析中...</span>
          </>
        ) : (
          <>
            <span className="text-base">🔮</span>
            <span>開始預測</span>
          </>
        )}
      </button>

      {/* 預測結果 */}
      {result && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-card to-secondary/20 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <span className="text-xs font-semibold text-foreground">預測結果</span>
              <span className={cn("text-[10px] font-semibold", selectedStrategy.color)}>
                · {selectedStrategy.emoji} {selectedStrategy.name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePredict}
                className="p-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                title="重新預測"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                onClick={handleCopy}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  copied
                    ? "bg-green-500/20 text-green-400"
                    : "bg-secondary/40 hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                )}
                title="複製號碼"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* 球號展示 */}
          <div className="flex justify-center gap-2 flex-wrap mb-3">
            {result.numbers.map((n, idx) => (
              <PredictBall
                key={n}
                number={n}
                size="lg"
                animate={animating && idx < 3}
              />
            ))}
          </div>

          {/* 號碼文字 */}
          <div className="text-center mb-2">
            <span className="text-[10px] text-muted-foreground">號碼：</span>
            <span className="text-[11px] font-mono font-bold text-foreground">
              {result.numbers.map(n => String(n).padStart(2, "0")).join(" · ")}
            </span>
          </div>

          {/* 策略說明 */}
          <div className={cn("p-2 rounded-lg text-center", selectedStrategy.bgColor, "border", selectedStrategy.borderColor)}>
            <p className={cn("text-[10px] font-medium", selectedStrategy.color)}>
              {result.reasoning}
            </p>
          </div>

          {result.totalPeriods > 0 && (
            <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
              基於近 {result.totalPeriods} 期開獎數據分析
            </p>
          )}
        </div>
      )}

      {/* 免責聲明 */}
      <p className="text-[9px] text-muted-foreground/40 text-center px-2">
        ⚠️ 預測結果僅供娛樂參考，彩票開獎具有隨機性，請理性娛樂，切勿沉迷。
      </p>
    </div>
  );
}
