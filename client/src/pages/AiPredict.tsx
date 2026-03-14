import { trpc } from "@/lib/trpc";
import NumberBall from "@/components/NumberBall";
import {
  getBigSmallLabel,
  getOddEvenLabel,
  getPlateLabel,
  padNumber,
} from "@/lib/utils";

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const getColor = (v: number) => {
    if (v >= 65) return "oklch(0.70 0.18 150)";
    if (v >= 55) return "oklch(0.78 0.15 85)";
    return "oklch(0.60 0.02 260)";
  };

  const getStatus = (v: number) => {
    if (v >= 65) return "推薦";
    if (v >= 55) return "觀望";
    return "觀望";
  };

  return (
    <div className="p-2.5 rounded-lg bg-secondary/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            background: `color-mix(in oklch, ${getColor(value)} 20%, transparent)`,
            color: getColor(value),
          }}
        >
          {getStatus(value)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${value}%`,
              background: getColor(value),
            }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold" style={{ color: getColor(value) }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

export default function AiPredict() {
  const { data: prediction } = trpc.prediction.latest.useQuery();
  const { data: recentPredictions } = trpc.prediction.recent.useQuery({ limit: 5 });

  return (
    <div className="min-h-screen">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold gradient-text">AI 智能預測</h1>
        <p className="text-[10px] text-muted-foreground">基於歷史數據的智能分析</p>
      </header>

      {prediction && (
        <>
          {/* Main prediction card */}
          <div className="mx-4 mb-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-xs font-semibold">AI 智能預測分析</p>
                  <p className="text-[10px] text-muted-foreground">
                    目標期號: {prediction.targetDrawNumber}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">樣本數</p>
                <p className="text-sm font-bold text-primary">{prediction.sampleSize}</p>
              </div>
            </div>

            {/* Recommended numbers */}
            <div className="mb-4 p-3 rounded-lg bg-secondary/30 border border-primary/20">
              <p className="text-[10px] text-muted-foreground mb-2">★ 本期焦點推薦號碼</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {(prediction.recommendedNumbers as number[]).map((num) => (
                  <NumberBall key={num} number={num} isHighlighted size="lg" />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  信心 <span className="font-bold text-primary">{prediction.overallConfidence}%</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  樣本 <span className="font-bold text-foreground">{prediction.sampleSize}</span>
                </span>
              </div>
            </div>

            {/* AI Suggestion */}
            {prediction.aiSuggestion && (
              <div className="mb-4 p-3 rounded-lg bg-secondary/30">
                <p className="text-[10px] font-semibold mb-1">AI 建議</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {prediction.aiSuggestion}
                </p>
              </div>
            )}

            {/* Prediction dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">📈</span>
                  <span className="text-[10px] text-muted-foreground">總和大小</span>
                </div>
                <p className="text-sm font-bold tag-big">
                  {getBigSmallLabel(prediction.totalBigSmall)}
                </p>
                <ConfidenceBar value={prediction.totalBigSmallConfidence} label="" />
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">⚖️</span>
                  <span className="text-[10px] text-muted-foreground">總和單雙</span>
                </div>
                <p className="text-sm font-bold tag-odd">
                  {getOddEvenLabel(prediction.totalOddEven)}
                </p>
                <ConfidenceBar value={prediction.totalOddEvenConfidence} label="" />
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🔥</span>
                  <span className="text-[10px] text-muted-foreground">超級大小</span>
                </div>
                <p className="text-sm font-bold tag-big">
                  {getBigSmallLabel(prediction.superBigSmall)}
                </p>
                <ConfidenceBar value={prediction.superBigSmallConfidence} label="" />
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🧲</span>
                  <span className="text-[10px] text-muted-foreground">超級單雙</span>
                </div>
                <p className="text-sm font-bold tag-odd">
                  {getOddEvenLabel(prediction.superOddEven)}
                </p>
                <ConfidenceBar value={prediction.superOddEvenConfidence} label="" />
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/50 col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">🧱</span>
                  <span className="text-[10px] text-muted-foreground">盤面分布</span>
                </div>
                <p className="text-sm font-bold tag-upper">
                  {getPlateLabel(prediction.platePrediction)}盤
                </p>
                <ConfidenceBar value={prediction.plateConfidence} label="" />
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mx-4 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-[10px] text-destructive">
              ⚠️ 預測僅供參考，請勿梭哈上頭。AI model based on historical data. Past performance is not indicative of future results.
            </p>
          </div>
        </>
      )}

      {/* Recent predictions */}
      {recentPredictions && recentPredictions.length > 1 && (
        <div className="mx-4 mb-20">
          <h3 className="text-xs font-semibold mb-3">歷史預測紀錄</h3>
          <div className="space-y-2">
            {recentPredictions.slice(1).map((pred) => (
              <div key={pred.id} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    期號 {pred.targetDrawNumber}
                  </span>
                  <span className="text-[10px] text-primary font-bold">
                    信心 {pred.overallConfidence}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(pred.recommendedNumbers as number[]).map((num) => (
                    <NumberBall key={num} number={num} isHighlighted />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
