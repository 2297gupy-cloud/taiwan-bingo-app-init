import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import NumberBall from "@/components/NumberBall";
import {
  getBigSmallLabel,
  getOddEvenLabel,
  getPlateLabel,
  padNumber,
} from "@/lib/utils";
import { toast } from "sonner";
import { RotateCcw, Search, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Checker() {
  const [, setLocation] = useLocation();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawNumber, setDrawNumber] = useState("");
  const [shouldCheck, setShouldCheck] = useState(false);

  const queryInput = useMemo(
    () => ({
      numbers: selectedNumbers,
      drawNumber: drawNumber || undefined,
    }),
    [selectedNumbers, drawNumber]
  );

  const { data: result, isFetching } = trpc.checker.check.useQuery(queryInput, {
    enabled: shouldCheck && selectedNumbers.length > 0,
  });

  const toggleNumber = (num: number) => {
    setShouldCheck(false);
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= 20) {
        toast.error("最多選擇 20 個號碼");
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const handleCheck = () => {
    if (selectedNumbers.length === 0) {
      toast.error("請至少選擇一個號碼");
      return;
    }
    setShouldCheck(true);
  };

  const handleReset = () => {
    setSelectedNumbers([]);
    setDrawNumber("");
    setShouldCheck(false);
  };

  return (
    <div className="min-h-screen">
      {/* Header with back button */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2">
        <button onClick={() => setLocation("/")} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-bold">對獎工具</h1>
          <p className="text-[8px] text-muted-foreground">選擇號碼與開獎結果比對</p>
        </div>
      </header>

      {/* Draw number input */}
      <div className="mx-3 mt-3 mb-3">
        <label className="text-[10px] text-muted-foreground block mb-1">
          期號（留空則比對最新一期）
        </label>
        <input
          type="text"
          value={drawNumber}
          onChange={(e) => { setDrawNumber(e.target.value); setShouldCheck(false); }}
          placeholder="輸入期號，例如 1150313086"
          className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Number grid */}
      <div className="mx-3 mb-3 p-3 rounded-lg bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">
            選擇號碼 <span className="text-muted-foreground font-normal">({selectedNumbers.length}/20)</span>
          </p>
          <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="w-3 h-3" /> 重置
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedNumbers.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={`w-full aspect-square rounded-full flex items-center justify-center text-[9px] font-bold border transition-all active:scale-90 ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {padNumber(num)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected numbers */}
      {selectedNumbers.length > 0 && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-card border border-border">
          <p className="text-[10px] text-muted-foreground mb-2">已選號碼</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedNumbers.map((num) => (
              <NumberBall key={num} number={num} isHighlighted />
            ))}
          </div>
        </div>
      )}

      {/* Check button */}
      <div className="mx-3 mb-4">
        <button
          onClick={handleCheck}
          disabled={selectedNumbers.length === 0 || isFetching}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          <Search className="w-4 h-4" />
          {isFetching ? "比對中..." : "開始對獎"}
        </button>
      </div>

      {/* Result */}
      {shouldCheck && result && (
        <div className="mx-3 mb-20 p-3 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-semibold mb-2">對獎結果</h3>
          <div className="mb-2">
            <p className="text-[10px] text-muted-foreground mb-1">期號: {result.draw.drawNumber}</p>
            <div className="flex flex-wrap gap-0.5">
              {(result.draw.numbers as number[]).map((num, i) => (
                <NumberBall key={i} number={num} isSuper={num === result.draw.superNumber} isHighlighted={result.matchedNumbers.includes(num)} />
              ))}
            </div>
          </div>
          <div className="p-2.5 rounded bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-primary">{result.matchCount}</span>
              <span className="text-xs text-muted-foreground">/ {result.totalSelected} 個號碼命中</span>
            </div>
            {result.matchedNumbers.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">命中號碼:</p>
                <div className="flex flex-wrap gap-1">
                  {result.matchedNumbers.map((num) => (
                    <NumberBall key={num} number={num} isHighlighted />
                  ))}
                </div>
              </div>
            )}
            {result.matchCount === 0 && (
              <p className="text-xs text-muted-foreground">很遺憾，本期沒有命中任何號碼。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
