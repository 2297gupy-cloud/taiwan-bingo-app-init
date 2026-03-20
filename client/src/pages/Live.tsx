import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
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

export default function Live() {
  const { data: latest, refetch } = trpc.draw.latest.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: recent } = trpc.draw.recent.useQuery(
    { limit: 10 },
    { refetchInterval: 15000 }
  );
  const { data: history50 } = trpc.draw.recent.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 }
  );
  const { data: history30days } = trpc.draw.recent.useQuery({
    limit: 500,
  }, {
    refetchInterval: 60000
  });

  const [countdown, setCountdown] = useState(getCountdown());
  const [sortMode, setSortMode] = useState<"draw" | "size">("draw");
  
  // CSV 下載函數
  const downloadCSV = () => {
    if (!history30days || history30days.length === 0) {
      alert("沒有數據可下載");
      return;
    }
    
    const headers = ["期號", "開獎時間", "號碼", "總和", "大小", "單雙", "超級號", "盤面"];
    const rows = history30days.map((draw: any) => [
      draw.drawNumber,
      draw.drawTime,
      (draw.numbers as number[]).join(","),
      draw.total,
      draw.bigSmall,
      draw.oddEven,
      draw.superNumber,
      draw.plate,
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `台灣賓果_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };
  
  // 數據驗證函數
  const validateData = () => {
    if (!history30days || history30days.length === 0) {
      alert("沒有數據可驗證");
      return;
    }
    
    let validCount = 0;
    let invalidCount = 0;
    
    history30days.forEach((draw: any) => {
      const drawNum = draw.drawNumber.toString();
      if (drawNum.length === 9 && /^\d+$/.test(drawNum)) {
        validCount++;
      } else {
        invalidCount++;
      }
    });
    
    alert(`數據驗證結果:\n正確: ${validCount} 期\n錯誤: ${invalidCount} 期\n總計: ${history30days.length} 期`);
  };

  useEffect(() => {
    let lastRefetchTime = 0;
    const timer = setInterval(() => {
      const cd = getCountdown();
      setCountdown(cd);
      // 當倒數到 0-2 秒時觸發 refetch（避免漏掉瞬間）
      if (cd.minutes === 0 && cd.seconds <= 2) {
        const now = Date.now();
        // 防止重複 refetch（同一秒內只 refetch 一次）
        if (now - lastRefetchTime > 1000) {
          lastRefetchTime = now;
          refetch();
        }
      }
    }, 500); // 改為 500ms 更新一次，提高精度
    return () => clearInterval(timer);
  }, [refetch]);

  const sortedNumbers = useMemo(() => {
    if (!latest) return [];
    const nums = [...(latest.numbers as number[])];
    if (sortMode === "size") {
      return nums.sort((a, b) => a - b);
    }
    return nums;
  }, [latest, sortMode]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold gradient-text">即時開獎</h1>
        <p className="text-[10px] text-muted-foreground">台灣賓果 · 每5分鐘開獎</p>
      </header>

      {/* Current Draw */}
      {latest && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-card border border-border">
          {/* Period info */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">目前期數</p>
              <p className="text-xl font-mono font-bold text-foreground">
                No. {latest.drawNumber}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatFullDateTime(latest.drawTime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground mb-1">下期開獎倒數</p>
              <div className="flex items-center gap-1">
                <span className="countdown-digit">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="text-destructive font-bold text-xl">:</span>
                <span className="countdown-digit">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {/* Sort toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSortMode("draw")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                sortMode === "draw"
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              開獎順序
            </button>
            <button
              onClick={() => setSortMode("size")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                sortMode === "size"
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              大小順序
            </button>
          </div>

          {/* Numbers */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {sortedNumbers.map((num, i) => (
              <NumberBall
                key={i}
                number={num}
                isSuper={num === latest.superNumber}
                size="lg"
              />
            ))}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs bg-secondary/50 rounded-lg px-3 py-2">
            <span className="text-muted-foreground">
              總和 <span className="font-bold text-foreground">{latest.total}</span>
            </span>
            <span className="text-muted-foreground">
              大小{" "}
              <span className={`font-bold ${getBigSmallClass(latest.bigSmall)}`}>
                {getBigSmallLabel(latest.bigSmall)}
              </span>
            </span>
            <span className="text-muted-foreground">
              單雙{" "}
              <span className={`font-bold ${getOddEvenClass(latest.oddEven)}`}>
                {getOddEvenLabel(latest.oddEven)}
              </span>
            </span>
            <span className="text-muted-foreground">
              超級{" "}
              <span className="font-bold text-destructive">
                {padNumber(latest.superNumber)}
              </span>
            </span>
            <span className="text-muted-foreground">
              盤面{" "}
              <span className={`font-bold ${getPlateClass(latest.plate)}`}>
                {getPlateLabel(latest.plate)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Data controls */}
      <div className="mx-4 mb-4 flex gap-2">
        <button
          onClick={validateData}
          className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-xs font-semibold text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          數據驗證
        </button>
        <button
          onClick={downloadCSV}
          className="flex-1 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-xs font-semibold text-green-400 hover:bg-green-500/30 transition-colors"
        >
          下載 CSV
        </button>
      </div>

      {/* Recent draws */}
      <div className="mx-4 mb-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span>近期開獎</span>
        </h2>

        <div className="space-y-2">
          {recent?.map((draw: any) => (
            <div
              key={draw.id}
              className="p-3 rounded-lg bg-card border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {draw.drawNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {new Date(draw.drawTime).toLocaleString("zh-TW")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(draw.numbers as number[]).map((num, i) => (
                  <NumberBall
                    key={i}
                    number={num}
                    isSuper={num === draw.superNumber}
                    size="sm"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-muted-foreground">
                  總和 <span className="font-bold text-foreground">{draw.total}</span>
                </span>
                <span className={`font-bold ${getBigSmallClass(draw.bigSmall)}`}>
                  {getBigSmallLabel(draw.bigSmall)}
                </span>
                <span className={`font-bold ${getOddEvenClass(draw.oddEven)}`}>
                  {getOddEvenLabel(draw.oddEven)}
                </span>
                <span className="font-bold text-destructive">
                  {padNumber(draw.superNumber)}
                </span>
                <span className={`font-bold ${getPlateClass(draw.plate)}`}>
                  {getPlateLabel(draw.plate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History 50 draws */}
      <div className="mx-4 mb-20">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span>歷史號碼（最近50期）</span>
        </h2>

        <div className="grid grid-cols-2 gap-1">
          {history50?.map((draw: any) => (
            <div
              key={draw.id}
              className="p-2 rounded-lg bg-card border border-border/30 text-[9px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-semibold text-foreground">
                  {draw.drawNumber}
                </span>
                <span className="text-muted-foreground/70">
                  {new Date(draw.drawTime).toLocaleString("zh-TW", { 
                    month: "2-digit", 
                    day: "2-digit", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {(draw.numbers as number[]).map((num, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-[7px] font-semibold"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
