import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AnalysisResult {
  goldenBalls: number[];
  reasoning: string;
  usedLLM?: boolean;
  usedProfessionalAnalysis?: boolean;
  sampleCount?: number;
  // 7 項分析欄位（來自 analyzeCustomData）
  hotAnalysis?: string;       // 1. 強勢熱號 + 尾數共振
  streakAnalysis?: string;    // 2. 連莊號分析
  diagonalAnalysis?: string;  // 3. 斜連交會點
  deadNumbers?: string;       // 4. 死碼排除
  coldAnalysis?: string;      // 5. 冷號回補
  trendAnalysis?: string;     // 6. 區間趨勢
  coreConclusion?: string;    // 7. 核心演算結論
  strategy?: string;          // 整體策略
  tailNote?: string;          // 尾數共振（額外欄位）
  parseErrors?: string[];
}

interface AnalysisResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AnalysisResult | null;
  title?: string;
  sourceHour?: string;
  targetHour?: string;
}

export function AnalysisResultModal({
  open,
  onOpenChange,
  result,
  title,
  sourceHour,
  targetHour,
}: AnalysisResultModalProps) {
  if (!result) return null;

  const usedAI = result.usedProfessionalAnalysis || result.usedLLM;

  const copyResult = () => {
    const lines = [
      `🎯 推薦黃金球: ${result.goldenBalls.join(", ")}`,
      `💡 ${result.reasoning}`,
    ];
    if (result.hotAnalysis) lines.push(`1. 強勢熱號：${result.hotAnalysis}`);
    if (result.streakAnalysis) lines.push(`2. 連莊號：${result.streakAnalysis}`);
    if (result.diagonalAnalysis) lines.push(`3. 斜連交會點：${result.diagonalAnalysis}`);
    if (result.deadNumbers) lines.push(`4. 死碼排除：${result.deadNumbers}`);
    if (result.coldAnalysis) lines.push(`5. 冷號回補：${result.coldAnalysis}`);
    if (result.trendAnalysis) lines.push(`6. 趨勢分析：${result.trendAnalysis}`);
    if (result.coreConclusion) lines.push(`7. 核心結論：${result.coreConclusion}`);
    if (result.strategy) lines.push(`整體策略：${result.strategy}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("分析報告已複製");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-3">
        {/* 標題 */}
        <DialogHeader className="mb-2 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <DialogTitle className="text-sm font-bold">
              {title || "AI 分析報告"}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {sourceHour && targetHour && (
              <span className="text-muted-foreground">{sourceHour}時 → {targetHour}時</span>
            )}
            {result.sampleCount && (
              <span className="text-muted-foreground">• {result.sampleCount}期</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
              usedAI 
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}>
              {usedAI ? "🤖 AI 演算" : "📊 統計方法"}
            </span>
          </div>
        </DialogHeader>

        {/* 單一框內容 - 所有內容緊排 */}
        <div className="border border-border/40 rounded-lg p-2.5 space-y-1.5 bg-background/50">
          {/* 黃金球 */}
          <div>
            <p className="text-[10px] text-yellow-400 font-semibold mb-1">🎯 推薦黃金球</p>
            <div className="flex items-center gap-1 flex-wrap mb-1">
              {result.goldenBalls.map((ball) => (
                <div
                  key={ball}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border border-yellow-300 shadow-sm"
                >
                  <span className="text-xs font-bold text-white">{ball}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {result.reasoning}
            </p>
          </div>

          {/* 分隔線 */}
          <div className="h-px bg-border/20" />

          {/* 7 項分析 - 緊排顯示 */}
          {result.hotAnalysis && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">1. 強勢熱號</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.hotAnalysis}</p>
            </div>
          )}

          {result.streakAnalysis && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">2. 連莊號</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.streakAnalysis}</p>
            </div>
          )}

          {result.diagonalAnalysis && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">3. 斜連交會點</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.diagonalAnalysis}</p>
            </div>
          )}

          {result.deadNumbers && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">4. 死碼排除</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.deadNumbers}</p>
            </div>
          )}

          {result.coldAnalysis && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">5. 冷號回補</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.coldAnalysis}</p>
            </div>
          )}

          {result.trendAnalysis && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">6. 區間趨勢</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.trendAnalysis}</p>
            </div>
          )}

          {result.coreConclusion && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">7. 核心演算結論</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.coreConclusion}</p>
            </div>
          )}

          {result.strategy && (
            <div>
              <span className="text-[10px] font-semibold text-yellow-400">整體策略</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.strategy}</p>
            </div>
          )}

          {/* 若無 7 項分析（舊版統計方法），顯示 tailNote */}
          {!result.hotAnalysis && result.tailNote && (
            <div>
              <span className="text-[10px] font-semibold text-primary/80">尾數共振</span>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{result.tailNote}</p>
            </div>
          )}
        </div>

        {/* 複製按鈕 */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs mt-2"
          onClick={copyResult}
        >
          <Copy className="w-3 h-3 mr-1" />
          複製報告
        </Button>

        {result.parseErrors && result.parseErrors.length > 0 && (
          <p className="text-[10px] text-orange-400 text-center mt-1">
            ⚠ {result.parseErrors.length} 行解析失敗
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
