import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const [expanded, setExpanded] = useState(false);

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

  // 組合 7 項分析內容
  const analysisLines: { label: string; content: string }[] = [];
  if (result.hotAnalysis) {
    analysisLines.push({ label: "1. 強勢熱號 + 尾數共振", content: result.hotAnalysis });
  }
  if (result.streakAnalysis) {
    analysisLines.push({ label: "2. 連莊號分析", content: result.streakAnalysis });
  }
  if (result.diagonalAnalysis) {
    analysisLines.push({ label: "3. 斜連交會點", content: result.diagonalAnalysis });
  }
  if (result.deadNumbers) {
    analysisLines.push({ label: "4. 死碼排除", content: result.deadNumbers });
  }
  if (result.coldAnalysis) {
    analysisLines.push({ label: "5. 冷號回補", content: result.coldAnalysis });
  }
  if (result.trendAnalysis) {
    analysisLines.push({ label: "6. 區間分布趨勢", content: result.trendAnalysis });
  }
  if (result.coreConclusion) {
    analysisLines.push({ label: "7. 核心演算結論（5期策略）", content: result.coreConclusion });
  }
  // 若無 7 項分析（舊版統計方法），顯示 tailNote
  if (analysisLines.length === 0 && result.tailNote) {
    analysisLines.push({ label: "尾數共振", content: result.tailNote });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-3">
        {/* 標題 */}
        <DialogHeader className="mb-2 space-y-1">
          <DialogTitle className="text-sm font-bold">
            {title || "AI 分析報告"}
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground">
            {sourceHour && targetHour && `${sourceHour}時 → ${targetHour}時`}
            {result.sampleCount ? ` • ${result.sampleCount}期` : ""}
            {" • "}{usedAI ? "AI演算" : "統計方法"}
          </p>
        </DialogHeader>

        {/* 預設顯示：黃金球 + 推理說明 */}
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border-b border-border/30">
            <p className="text-[10px] text-yellow-400 font-semibold mb-1.5">🎯 推薦黃金球</p>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {result.goldenBalls.map((ball) => (
                <div
                  key={ball}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border border-yellow-300 shadow-sm"
                >
                  <span className="text-xs font-bold text-white">{ball}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 推理說明 */}
          <div className="px-3 py-2 border-b border-border/20">
            <p className="text-[10px] font-semibold text-primary/80 mb-1">推理說明</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {result.reasoning}
            </p>
          </div>

          {/* 展開/折疊詳細分析 */}
          {analysisLines.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-secondary/20 transition-colors border-b border-border/20"
              >
                <span className="text-[10px] font-semibold text-primary/80">
                  詳細演算分析 ({analysisLines.length}項)
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>

              {/* 詳細分析內容 - 條件展開 */}
              {expanded && (
                <div className="divide-y divide-border/20">
                  {analysisLines.map((item, idx) => (
                    <div key={idx} className="px-3 py-1.5">
                      <span className="text-[10px] font-semibold text-primary/80">
                        {item.label}
                      </span>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 整體策略 */}
          {result.strategy && (
            <div className="px-3 py-1.5 bg-yellow-500/5 border-t border-border/20">
              <p className="text-[10px] font-semibold text-yellow-400 mb-0.5">整體策略</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{result.strategy}</p>
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
