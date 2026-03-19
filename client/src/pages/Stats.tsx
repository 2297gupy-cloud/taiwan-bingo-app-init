import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = {
  big: "oklch(0.65 0.22 25)",
  small: "oklch(0.70 0.18 150)",
  odd: "oklch(0.78 0.15 85)",
  even: "oklch(0.60 0.15 260)",
  upper: "oklch(0.70 0.15 50)",
  lower: "oklch(0.60 0.15 260)",
  middle: "oklch(0.50 0.02 260)",
};

export default function Stats() {
  const [periods, setPeriods] = useState(50);
  const { data: stats } = trpc.stats.summary.useQuery({ periods });

  const bigSmallData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "大", value: stats.bigSmall.big, color: COLORS.big },
      { name: "小", value: stats.bigSmall.small, color: COLORS.small },
    ];
  }, [stats]);

  const oddEvenData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "單", value: stats.oddEven.odd, color: COLORS.odd },
      { name: "雙", value: stats.oddEven.even, color: COLORS.even },
    ];
  }, [stats]);

  const plateData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "上盤", value: stats.plate.upper, color: COLORS.upper },
      { name: "下盤", value: stats.plate.lower, color: COLORS.lower },
      { name: "中盤", value: stats.plate.middle, color: COLORS.middle },
    ];
  }, [stats]);

  const numberFreqData = useMemo(() => {
    if (!stats?.numberFrequency) return [];
    return Object.entries(stats.numberFrequency)
      .map(([num, freq]) => ({ number: Number(num), frequency: freq }))
      .sort((a, b) => a.number - b.number);
  }, [stats]);

  const topColdNumbers = useMemo(() => {
    if (!numberFreqData.length) return { hot: [] as typeof numberFreqData, cold: [] as typeof numberFreqData };
    const sorted = [...numberFreqData].sort((a, b) => b.frequency - a.frequency);
    return {
      hot: sorted.slice(0, 10),
      cold: sorted.slice(-10).reverse(),
    };
  }, [numberFreqData]);

  return (
    <div className="min-h-screen">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold gradient-text">統計分析</h1>
        <p className="text-[10px] text-muted-foreground">多維度數據統計</p>
      </header>

      {/* Period selector */}
      <div className="mx-4 mb-4 flex gap-2">
        {[20, 50, 100, 200].map((p) => (
          <button
            key={p}
            onClick={() => setPeriods(p)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              periods === p
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}期
          </button>
        ))}
      </div>

      {stats && (
        <>
          {/* Pie charts row */}
          <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
            {/* Big/Small pie */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-semibold mb-1 text-center">大小比例</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bigSmallData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      dataKey="value"
                      stroke="none"
                    >
                      {bigSmallData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.28 0.02 260)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "oklch(0.92 0.01 260)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 text-[10px]">
                <span style={{ color: COLORS.big }}>
                  ● 大 {Math.round((stats.bigSmall.big / stats.periods) * 100)}%
                </span>
                <span style={{ color: COLORS.small }}>
                  ● 小 {Math.round((stats.bigSmall.small / stats.periods) * 100)}%
                </span>
              </div>
            </div>

            {/* Odd/Even pie */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-semibold mb-1 text-center">單雙比例</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={oddEvenData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      dataKey="value"
                      stroke="none"
                    >
                      {oddEvenData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.28 0.02 260)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "oklch(0.92 0.01 260)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 text-[10px]">
                <span style={{ color: COLORS.odd }}>
                  ● 單 {Math.round((stats.oddEven.odd / stats.periods) * 100)}%
                </span>
                <span style={{ color: COLORS.even }}>
                  ● 雙 {Math.round((stats.oddEven.even / stats.periods) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Plate distribution */}
          <div className="mx-4 mb-4 p-3 rounded-xl bg-card border border-border">
            <p className="text-xs font-semibold mb-2">盤面分布</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    dataKey="value"
                    stroke="none"
                  >
                    {plateData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.16 0.015 260)",
                      border: "1px solid oklch(0.28 0.02 260)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "oklch(0.92 0.01 260)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 text-[10px]">
              {plateData.map((d) => (
                <span key={d.name} style={{ color: d.color }}>
                  ● {d.name} {Math.round((d.value / stats.periods) * 100)}%
                </span>
              ))}
            </div>
          </div>

          {/* Number frequency chart */}
          <div className="mx-4 mb-4 p-3 rounded-xl bg-card border border-border">
            <p className="text-xs font-semibold mb-2">號碼出現頻率</p>
            <div className="h-52 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={numberFreqData} barSize={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                  <XAxis
                    dataKey="number"
                    tick={{ fontSize: 7, fill: "oklch(0.60 0.02 260)" }}
                    interval={9}
                  />
                  <YAxis tick={{ fontSize: 8, fill: "oklch(0.60 0.02 260)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.16 0.015 260)",
                      border: "1px solid oklch(0.28 0.02 260)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "oklch(0.92 0.01 260)",
                    }}
                    formatter={(value: number) => [`${value} 次`, "出現次數"]}
                    labelFormatter={(label) => `號碼 ${label}`}
                  />
                  <Bar dataKey="frequency" fill="oklch(0.78 0.15 85)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hot & Cold numbers */}
          <div className="mx-4 mb-20 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-semibold mb-2 text-destructive">🔥 熱門號碼</p>
              <div className="space-y-1">
                {topColdNumbers.hot.map((item, i) => (
                  <div key={item.number} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                      <span className="text-xs font-bold text-primary">
                        {String(item.number).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.frequency}次</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.60 0.15 260)" }}>
                🧊 冷門號碼
              </p>
              <div className="space-y-1">
                {topColdNumbers.cold.map((item, i) => (
                  <div key={item.number} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                      <span className="text-xs font-bold" style={{ color: "oklch(0.60 0.15 260)" }}>
                        {String(item.number).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.frequency}次</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
