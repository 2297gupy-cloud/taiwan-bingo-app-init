import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
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
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Trend() {
  const [, setLocation] = useLocation();
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2">
        <button onClick={() => setLocation("/")} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-bold">走勢分析</h1>
          <p className="text-[8px] text-muted-foreground">台灣賓果圖表視窗</p>
        </div>
      </header>

      {/* Period selector */}
      <div className="mx-3 mt-3 mb-2 flex gap-1.5">
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
      <div className="mx-3 mb-3 flex gap-1.5">
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

      {stats && (
        <>
          {/* Big/Small & Odd/Even stats - 4 grid */}
          <div className="mx-3 mb-3 grid grid-cols-4 gap-2">
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
          {view === "total" && totalTrendData.length > 0 && (
            <div className="mx-3 mb-3 p-3 rounded-lg bg-card border border-border">
              <h3 className="text-[10px] font-semibold mb-2">總和走勢圖 (近{periods}期)</h3>
              <div className="h-44">
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
          <div className="mx-3 mb-20 p-3 rounded-lg bg-card border border-border">
            <h3 className="text-[10px] font-semibold mb-2">熱門號碼 TOP 10</h3>
            <div className="h-44">
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
        </>
      )}
    </div>
  );
}
