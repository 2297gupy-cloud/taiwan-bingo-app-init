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

  const [countdown, setCountdown] = useState(getCountdown());
  const [sortMode, setSortMode] = useState<"draw" | "size">("draw");

  useEffect(() => {
    const timer = setInterval(() => {
      const cd = getCountdown();
      setCountdown(cd);
      if (cd.minutes === 0 && cd.seconds === 0) {
        refetch();
      }
    }, 1000);
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

      {/* Recent draws */}
      <div className="mx-4 mb-20">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span>近期開獎</span>
        </h2>

        <div className="space-y-2">
          {recent?.map((draw) => (
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
    </div>
  );
}
