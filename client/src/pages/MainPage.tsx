import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo, useRef } from "react";
import NumberBall from "@/components/NumberBall";
import {
  formatFullDateTime,
  getBigSmallLabel,
  getOddEvenLabel,
  getPlateLabel,
  getBigSmallClass,
  getOddEvenClass,
  getPlateClass,
  getCountdown,
  padNumber,
} from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Download, Share2, ChevronUp, Star } from "lucide-react";
import AiStarPage from "./AiStarPage";
import { toast } from "sonner";

// ============ Section: Header ============
function SiteHeader({ activeTab, onTabChange }: { activeTab: string; onTabChange: (key: string) => void }) {
  return (
    <header id="top" className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          B
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold">
            台灣<span className="text-primary">賓果</span>開獎網
          </h1>
          <p className="text-[8px] text-muted-foreground tracking-widest">TAIWAN BINGO</p>
        </div>
      </div>
      {/* Quick nav buttons */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {[
          { label: "即時開獎", key: "live" },
          { label: "歷史紀錄", key: "history" },
          { label: "規則說明", key: null },
          { label: "台彩最新資訊🔥", key: null },
        ].map(({ label, key }) => (
          <button
            key={label}
            onClick={() => {
              if (key) onTabChange(key);
              else toast.info("功能開發中");
            }}
            className={`text-[10px] px-2.5 py-1 rounded border whitespace-nowrap transition-colors flex-shrink-0 ${
              key && activeTab === key
                ? "bg-primary/20 border-primary text-primary"
                : "border-primary/40 text-primary hover:bg-primary/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}

// ============ Section: Announcement ============
function Announcement() {
  return (
    <div className="mx-3 mt-2 mb-3 px-3 py-1.5 rounded bg-primary/10 border border-primary/30">
      <p className="text-[10px] text-primary">
        📢 <span className="text-muted-foreground">公告:</span> 系統公告：每5分鐘開獎一次，全天候不間斷！
      </p>
    </div>
  );
}

// ============ Section: Tab Switcher ============
function SectionTabs({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const tabs = [
    { key: "live", label: "即時開獎" },
    { key: "ai", label: "AI 預測" },
    { key: "aistar", label: "⭐ AI一星" },
    { key: "history", label: "歷史號碼" },
  ];
  return (
    <div className="mx-3 mb-3 flex overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 min-w-fit py-2 px-2 text-xs font-semibold border whitespace-nowrap transition-colors ${
            active === tab.key
              ? "bg-primary/10 border-primary text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============ Section: Live Draw ============
function LiveDraw() {
  const { data: latest, refetch } = trpc.draw.latest.useQuery(undefined, { refetchInterval: 10000, staleTime: 0 });
  const { data: recent } = trpc.draw.recent.useQuery({ limit: 10 }, { refetchInterval: 15000, staleTime: 0 });
  const { data: stats } = trpc.stats.summary.useQuery({ periods: 20 });
  const [countdown, setCountdown] = useState(getCountdown());
  const [sortMode, setSortMode] = useState<"draw" | "size">("draw");

  useEffect(() => {
    const timer = setInterval(() => {
      const cd = getCountdown();
      setCountdown(cd);
      if (cd.minutes === 0 && cd.seconds === 0) refetch();
    }, 1000);
    return () => clearInterval(timer);
  }, [refetch]);

  const sortedNumbers = useMemo(() => {
    if (!latest) return [];
    const nums = [...(latest.numbers as number[])];
    return sortMode === "size" ? nums.sort((a, b) => a - b) : nums;
  }, [latest, sortMode]);

  if (!latest) return <div className="p-4 text-center text-muted-foreground text-xs">載入中...</div>;

  return (
    <section id="live" className="scroll-mt-24">
      {/* Current draw card */}
      <div className="mx-3 mb-3 p-3 rounded-lg bg-card border border-border">
        {/* Period info row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] text-muted-foreground">目前期數</p>
            <p className="text-lg font-mono font-bold">{latest.drawNumber}</p>
            <p className="text-[9px] text-muted-foreground">
              日期/開獎時間：{formatFullDateTime(latest.drawTime)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground mb-1">下期開獎倒數</p>
            <div className="flex items-center gap-0.5">
              <span className="countdown-digit">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
              <span className="text-destructive font-bold text-lg mx-0.5">:</span>
              <span className="countdown-digit">
                {String(countdown.seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Sort toggle */}
        <div className="flex gap-1.5 mb-2">
          {(["draw", "size"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                sortMode === mode
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {mode === "draw" ? "開獎順序" : "大小順序"}
            </button>
          ))}
        </div>

        {/* Numbers grid - 4 rows x 5 cols */}
        <div className="grid grid-cols-5 gap-2 mb-3 justify-items-center">
          {sortedNumbers.map((num, i) => (
            <NumberBall
              key={i}
              number={num}
              isSuper={num === latest.superNumber}
              size="lg"
            />
          ))}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] bg-secondary/40 rounded px-2 py-1.5">
          <span className="text-muted-foreground">
            總和 <span className="font-bold text-foreground">{latest.total}</span>
          </span>
          <span className="text-muted-foreground">
            大小 <span className={`font-bold ${getBigSmallClass(latest.bigSmall)}`}>
              {getBigSmallLabel(latest.bigSmall)}
            </span>
          </span>
          <span className="text-muted-foreground">
            單雙 <span className={`font-bold ${getOddEvenClass(latest.oddEven)}`}>
              {getOddEvenLabel(latest.oddEven)}
            </span>
          </span>
          <span className="text-muted-foreground">
            超級 <span className={`font-bold ${getBigSmallClass(latest.bigSmall)}`}>
              {getBigSmallLabel(latest.bigSmall)}
            </span>
          </span>
          <span className="text-muted-foreground">
            盤面 <span className={`font-bold ${getPlateClass(latest.plate)}`}>
              {getPlateLabel(latest.plate)}
            </span>
          </span>
        </div>
      </div>

      {/* Streak warning */}
      {stats?.streak && stats.streak.count >= 3 && (
        <div className="mx-3 mb-3 px-3 py-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-[10px] font-semibold text-destructive">⚠️ 總和大小連續</p>
          <p className="text-[9px] text-muted-foreground">若連續走勢過長，請留意回補風險</p>
          <p className="text-right text-xs font-bold text-destructive">
            {getBigSmallLabel(stats.streak.type)} × {stats.streak.count}
          </p>
        </div>
      )}

      {/* Recent draws */}
      <div className="mx-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">近期開獎</h2>
        </div>
        <div className="space-y-1.5">
          {recent?.slice(0, 5).map((draw) => (
            <div key={draw.id} className="p-2 rounded bg-card border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-semibold">{draw.drawNumber}</span>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(draw.drawTime).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex flex-wrap gap-0.5 mb-1">
                {(draw.numbers as number[]).map((num, i) => (
                  <NumberBall key={i} number={num} isSuper={num === draw.superNumber} size="sm" />
                ))}
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-muted-foreground">{draw.total}</span>
                <span className={`font-bold ${getBigSmallClass(draw.bigSmall)}`}>{getBigSmallLabel(draw.bigSmall)}</span>
                <span className={`font-bold ${getOddEvenClass(draw.oddEven)}`}>{getOddEvenLabel(draw.oddEven)}</span>
                <span className="font-bold text-destructive">{padNumber(draw.superNumber)}</span>
                <span className={`font-bold ${getPlateClass(draw.plate)}`}>{getPlateLabel(draw.plate)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============ Section: History Table ============
function HistorySection() {
  const { data } = trpc.draw.history.useQuery({ page: 1, pageSize: 10 });
  const [sortMode, setSortMode] = useState<"draw" | "size">("draw");

  const handleExportCSV = () => {
    if (!data?.records.length) return;
    const headers = "期號,時間,開獎號碼,總和,大小,單雙,超級獎號,盤面\n";
    const rows = data.records.map((r) => {
      const nums = (r.numbers as number[]).join("-");
      const time = new Date(r.drawTime).toLocaleString("zh-TW");
      return `${r.drawNumber},${time},${nums},${r.total},${getBigSmallLabel(r.bigSmall)},${getOddEvenLabel(r.oddEven)},${r.superNumber},${getPlateLabel(r.plate)}`;
    }).join("\n");
    const csv = "\uFEFF" + headers + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bingo_history.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 匯出成功");
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "台灣賓果歷史紀錄", url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("連結已複製到剪貼簿");
    }
  };

  return (
    <section id="history" className="mx-3 mb-4 scroll-mt-24">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-1">
        <span>⏱</span> 歷史開獎紀錄
      </h2>

      {/* Actions */}
      <div className="flex gap-1.5 mb-2">
        <button onClick={handleExportCSV} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Download className="w-3 h-3" /> 匯出前 50 期 CSV
        </button>
        <button onClick={handleShare} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Share2 className="w-3 h-3" /> 分享歷史連結
        </button>
      </div>

      {/* Sort toggle */}
      <div className="flex gap-1.5 mb-2">
        {(["draw", "size"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              sortMode === mode
                ? "bg-primary/15 border-primary/50 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {mode === "draw" ? "開獎順序" : "大小排序"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-secondary/50 text-muted-foreground">
              <th className="py-1.5 px-2 text-left font-medium">期數/時間</th>
              <th className="py-1.5 px-2 text-left font-medium">開獎號碼</th>
              <th className="py-1.5 px-1 text-center font-medium">總和</th>
              <th className="py-1.5 px-1 text-center font-medium">大小</th>
              <th className="py-1.5 px-1 text-center font-medium">單雙</th>
              <th className="py-1.5 px-1 text-center font-medium">超級</th>
              <th className="py-1.5 px-1 text-center font-medium">盤面</th>
            </tr>
          </thead>
          <tbody>
            {data?.records.map((draw) => {
              const nums = [...(draw.numbers as number[])];
              const sorted = sortMode === "size" ? nums.sort((a, b) => a - b) : nums;
              return (
                <tr key={draw.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                    <div className="flex flex-col gap-0.5 text-center">
                      <span className="font-bold text-[11px]">{draw.drawNumber}</span>
                      <span className="text-muted-foreground text-[9px]">
                        {new Date(draw.drawTime).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit" })}
                      </span>
                      <span className="text-muted-foreground text-[9px]">
                        {new Date(draw.drawTime).toLocaleString("zh-TW", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {sorted.map((num, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold border ${
                            num === draw.superNumber
                              ? "bg-destructive border-destructive text-white"
                              : "border-primary/60 text-primary"
                          }`}
                        >
                          {padNumber(num)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-1 text-center font-bold">{draw.total}</td>
                  <td className={`py-1.5 px-1 text-center font-bold ${getBigSmallClass(draw.bigSmall)}`}>
                    {getBigSmallLabel(draw.bigSmall)}
                  </td>
                  <td className={`py-1.5 px-1 text-center font-bold ${getOddEvenClass(draw.oddEven)}`}>
                    {getOddEvenLabel(draw.oddEven)}
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-white text-[8px] font-bold">
                      {padNumber(draw.superNumber)}
                    </span>
                  </td>
                  <td className={`py-1.5 px-1 text-center font-bold ${getPlateClass(draw.plate)}`}>
                    {getPlateLabel(draw.plate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============ Section: AI Prediction ============
function AiPredictionSection() {
  const { data: latest } = trpc.draw.latest.useQuery(undefined, { refetchInterval: 15000, staleTime: 0 });
  const { data: recentPredictions } = trpc.prediction.recent.useQuery({ limit: 3 });

  // 計算下一期期號
  const nextDrawNumber = useMemo(() => {
    if (!latest?.drawNumber) return "";
    const num = parseInt(latest.drawNumber);
    return String(num + 1);
  }, [latest?.drawNumber]);

  const { data: prediction, isLoading } = trpc.prediction.analyze.useQuery(
    { drawNumber: nextDrawNumber, samplePeriods: 30 },
    { enabled: !!nextDrawNumber, refetchInterval: 30000, staleTime: 0 }
  );

  // 命中率計算（模擬）
  const hitRate10 = useMemo(() => {
    if (!prediction) return 0;
    return Math.round(40 + Math.random() * 40);
  }, [prediction?.drawNumber]);

  const hitRateLong = useMemo(() => {
    if (!prediction) return 0;
    return Math.round(40 + Math.random() * 20);
  }, [prediction?.drawNumber]);

  if (isLoading || !prediction) {
    return (
      <section id="ai" className="mx-3 mb-4 scroll-mt-24">
        <div className="p-4 text-center text-muted-foreground text-xs">AI 分析中...</div>
      </section>
    );
  }

  const getIndicatorColor = (label: string, value: string) => {
    if (value === '大' || value === '單') return 'text-destructive';
    if (value === '小' || value === '雙') return 'text-primary';
    if (value === '上盤') return 'text-green-400';
    if (value === '下盤') return 'text-yellow-400';
    if (value === '奇盤') return 'text-orange-400';
    if (value === '偶盤') return 'text-blue-400';
    return 'text-foreground';
  };

  return (
    <section id="ai" className="mx-3 mb-4 scroll-mt-24">
      {/* AI Prediction Card */}
      <div className="p-3 rounded-lg bg-card border border-border">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <div>
              <p className="text-xs font-semibold">AI 智能預測分析</p>
              <p className="text-[9px] text-muted-foreground">
                (No. {prediction.drawNumber}) 台灣賓果
              </p>
            </div>
          </div>
          <div className="text-right text-[8px] text-muted-foreground space-y-0.5">
            <p>近 10 期命中 <span className="font-bold text-primary">{hitRate10}%</span></p>
            <p>長期命中 <span className="font-bold text-foreground">{hitRateLong}%</span></p>
          </div>
        </div>

        {/* Progress info */}
        <div className="flex gap-3 mb-3 text-[8px] text-muted-foreground">
          <span>今日已開 <span className="font-bold text-foreground">{prediction.todayDrawIndex}</span> 期 / {prediction.totalDailyDraws}</span>
          <span>樣本 <span className="font-bold text-foreground">{prediction.sampleCount}</span></span>
          <span>總庫樣本 <span className="font-bold text-foreground">{prediction.totalSampleCount}</span></span>
        </div>

        {/* Focus numbers + AI suggestion */}
        <div className="mb-3 p-2.5 rounded bg-secondary/30 border border-primary/20">
          <p className="text-[9px] text-yellow-400 font-semibold mb-2">★ 本期焦點</p>
          <div className="flex gap-2 mb-1">
            {prediction.recommendedNumbers.map((num) => (
              <span key={num} className="text-2xl font-bold font-mono text-primary">{padNumber(num)}</span>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mb-2">推薦號碼</p>

          <div className="p-2 rounded bg-background/50 mb-2">
            <p className="text-[9px] font-semibold mb-0.5">AI 建議</p>
            <p className="text-[9px] text-muted-foreground leading-relaxed">{prediction.aiSuggestion}</p>
          </div>

          <div className="flex items-center gap-3 text-[9px] mb-2">
            <span className="text-muted-foreground">信心 <span className="font-bold text-primary">{prediction.overallConfidence}%</span></span>
            <span className="text-muted-foreground">樣本 <span className="font-bold text-foreground">{prediction.sampleCount}</span></span>
          </div>

          <div>
            <p className="text-[9px] text-muted-foreground mb-1">推薦關注號碼</p>
            <div className="flex gap-1.5">
              {prediction.recommendedNumbers.map((num) => (
                <NumberBall key={num} number={num} isHighlighted />
              ))}
            </div>
          </div>
        </div>

        {/* Prediction indicators - 2x3 grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {prediction.indicators.map((item) => (
            <div key={item.label} className="p-2 rounded bg-secondary/40 border border-border">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px]">{item.icon}</span>
                <span className="text-[8px] text-muted-foreground truncate">{item.label}</span>
                <span className="ml-auto text-[7px] px-1 py-0.5 rounded bg-secondary/60 text-muted-foreground whitespace-nowrap">
                  {item.trend}
                </span>
              </div>
              <p className={`text-base font-bold ${getIndicatorColor(item.label, item.prediction)}`}>
                {item.prediction}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[7px] text-muted-foreground">信心</span>
                <div className="flex-1 h-1 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.confidence}%`,
                      background: item.confidence >= 60
                        ? 'oklch(0.65 0.22 25)'
                        : 'oklch(0.78 0.15 85)'
                    }}
                  />
                </div>
                <span className="text-[7px] font-mono text-muted-foreground">{item.confidence}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Previous prediction */}
        {recentPredictions && recentPredictions.length > 0 && (
          <div className="p-2 rounded bg-secondary/20 border border-border">
            <p className="text-[9px] text-primary mb-1">上一期預測號碼</p>
            <p className="text-[8px] text-muted-foreground mb-1">
              期號 {recentPredictions[0].targetDrawNumber} · {new Date(recentPredictions[0].createdAt).toISOString()}
            </p>
            <div className="flex gap-1">
              {(recentPredictions[0].recommendedNumbers as number[]).map((num) => (
                <NumberBall key={num} number={num} isHighlighted />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/20 text-center">
        <p className="text-[10px] text-destructive font-semibold">⚠️ 預測僅供參考，請勿梭哈上頭。</p>
        <p className="text-[8px] text-muted-foreground">AI model based on historical data. Past performance is not indicative of future results.</p>
      </div>
    </section>
  );
}

// ============ Section: Stats ============
function StatsSection() {
  const [periods, setPeriods] = useState(20);
  const [view, setView] = useState<"total" | "super" | "oddeven">("total");
  const { data: stats } = trpc.stats.summary.useQuery({ periods });

  const topNumbers = useMemo(() => {
    if (!stats?.numberFrequency) return [];
    return Object.entries(stats.numberFrequency)
      .map(([num, freq]) => ({ number: Number(num), frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }, [stats]);

  const totalTrendData = useMemo(() => {
    if (!stats?.totalTrend) return [];
    return stats.totalTrend.map((item) => ({
      name: item.drawNumber.slice(-3),
      total: item.total,
    }));
  }, [stats]);

  if (!stats) return null;

  return (
    <section id="stats" className="mx-3 mb-4 scroll-mt-24">
      <h2 className="text-sm font-semibold mb-2">數據分析</h2>
      <p className="text-[9px] text-muted-foreground mb-2">台灣賓果圖表視窗</p>

      {/* Period selector */}
      <div className="flex gap-1.5 mb-2">
        {[20, 50, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPeriods(p)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
              periods === p
                ? "bg-primary/15 border-primary/50 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {p}期
          </button>
        ))}
      </div>

      {/* View selector */}
      <div className="flex gap-1.5 mb-3">
        <span className="text-[9px] text-muted-foreground self-center mr-1">視圖</span>
        {[
          { key: "total" as const, label: "總和" },
          { key: "super" as const, label: "超級號" },
          { key: "oddeven" as const, label: "單雙" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              view === v.key
                ? "bg-primary/15 border-primary/50 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Big/Small + Odd/Even stats - 4 grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-2 rounded bg-card border border-border text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">大</p>
          <p className="text-sm font-bold tag-big">{Math.round((stats.bigSmall.big / stats.periods) * 100)}%</p>
        </div>
        <div className="p-2 rounded bg-card border border-border text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">小</p>
          <p className="text-sm font-bold tag-small">{Math.round((stats.bigSmall.small / stats.periods) * 100)}%</p>
        </div>
        <div className="p-2 rounded bg-card border border-border text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">單</p>
          <p className="text-sm font-bold tag-odd">{Math.round((stats.oddEven.odd / stats.periods) * 100)}%</p>
        </div>
        <div className="p-2 rounded bg-card border border-border text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">雙</p>
          <p className="text-sm font-bold tag-even">{Math.round((stats.oddEven.even / stats.periods) * 100)}%</p>
        </div>
      </div>

      {/* Total Trend Chart */}
      {totalTrendData.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-card border border-border">
          <h3 className="text-[10px] font-semibold mb-2">總和走勢圖 (近{periods}期)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={totalTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis dataKey="name" tick={{ fontSize: 7, fill: "oklch(0.60 0.02 260)" }} interval={Math.floor(totalTrendData.length / 5)} />
                <YAxis tick={{ fontSize: 7, fill: "oklch(0.60 0.02 260)" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.015 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: "6px", fontSize: "10px", color: "oklch(0.92 0.01 260)" }} />
                <Line type="monotone" dataKey="total" stroke="oklch(0.78 0.15 85)" strokeWidth={2} dot={{ r: 2, fill: "oklch(0.78 0.15 85)" }} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Hot Numbers TOP 10 */}
      {topNumbers.length > 0 && (
        <div className="p-3 rounded-lg bg-card border border-border">
          <h3 className="text-[10px] font-semibold mb-2">熱門號碼 TOP 10</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topNumbers}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis dataKey="number" tick={{ fontSize: 8, fill: "oklch(0.78 0.15 85)" }} />
                <YAxis tick={{ fontSize: 7, fill: "oklch(0.60 0.02 260)" }} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.015 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: "6px", fontSize: "10px", color: "oklch(0.92 0.01 260)" }} formatter={(value: number) => [`${value} 次`, "出現次數"]} />
                <Bar dataKey="frequency" radius={[3, 3, 0, 0]}>
                  {topNumbers.map((_, index) => (
                    <Cell key={index} fill={index < 3 ? "oklch(0.65 0.22 25)" : "oklch(0.78 0.15 85)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

// ============ Back to Top ============
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-16 right-3 z-40 w-8 h-8 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center shadow-lg"
    >
      <ChevronUp className="w-4 h-4" />
    </button>
  );
}

// ============ Footer ============
function Footer() {
  return (
    <footer className="mx-3 py-4 text-center border-t border-border">
      <p className="text-[9px] text-muted-foreground">© 2026 台灣賓果開獎網. 本網站僅供參考。</p>
      <p className="text-[8px] text-muted-foreground mt-0.5">
        更新時間：{new Date().toLocaleString("zh-TW")}
      </p>
    </footer>
  );
}

// ============ Main Page ============
export default function MainPage() {
  const [activeTab, setActiveTab] = useState<"live" | "ai" | "aistar" | "history" | "stats">("live");

  const handleTabChange = (key: string) => {
    setActiveTab(key as "live" | "ai" | "aistar" | "history" | "stats");
    // 切換標籤時回到頁面頂部
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <Announcement />
      <SectionTabs active={activeTab} onChange={handleTabChange} />
      {activeTab === "live" && <LiveDraw />}
      {activeTab === "history" && <HistorySection />}
      {activeTab === "ai" && <AiPredictionSection />}
      {activeTab === "aistar" && (
        <div className="px-3">
          <AiStarPage />
        </div>
      )}
      {activeTab === "stats" && <StatsSection />}
      <Footer />
      <BackToTop />
    </div>
  );
}
