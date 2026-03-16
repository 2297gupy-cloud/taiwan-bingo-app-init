import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import NumberBall from "@/components/NumberBall";
import { Copy, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AnalysisResult {
  goldenBalls: number[];
  reasoning: string;
  usedLLM?: boolean;
  usedProfessionalAnalysis?: boolean;
  sampleCount?: number;
  hotAnalysis?: string;
  coldAnalysis?: string;
  trendAnalysis?: string;
  strategy?: string;
  tailNote?: string;
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
    if (result.tailNote) lines.push(`🔍 尾數共振：${result.tailNote}`);
    if (result.hotAnalysis) lines.push(`🔥 強勢熱號：${result.hotAnalysis}`);
    if (result.coldAnalysis) lines.push(`❄️ 冷號回補：${result.coldAnalysis}`);
    if (result.trendAnalysis) lines.push(`📈 趨勢分析：${result.trendAnalysis}`);
    if (result.strategy) lines.push(`🎯 整體策略：${result.strategy}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("分析報告已複製");
  };

  // 組合所有分析內容為一段連續文字
  const analysisLines: { icon: string; label: string; content: string }[] = [];
  if (result.tailNote) {
    analysisLines.push({ icon: "🔍", label: "尾數共振", content: result.tailNote });
  }
  if (result.hotAnalysis) {
    analysisLines.push({ icon: "🔥", label: "強勢熱號", content: result.hotAnalysis });
  }
  if (result.coldAnalysis) {
    analysisLines.push({ icon: "❄️", label: "冷號回補", content: result.coldAnalysis });
  }
  if (result.trendAnalysis) {
    analysisLines.push({ icon: "📈", label: "趨勢分析", content: result.trendAnalysis });
  }
  if (result.strategy) {
    analysisLines.push({ icon: "🎯", label: "整體策略", content: result.strategy });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {/* 標題列 */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-primary/20 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div>
              <DialogTitle className="text-sm font-bold leading-tight">
                {title || "AI 專業演算分析報告"}
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {sourceHour && targetHour && `${sourceHour}時 → ${targetHour}時`}
                {result.sampleCount ? ` • ${result.sampleCount}期` : ""}
                {" • "}{usedAI ? "AI演算" : "統計方法"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3">
          {/* 黃金球 */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-lg p-3 border border-yellow-500/30">
            <p className="text-[10px] text-yellow-400 font-semibold mb-2">🎯 推薦黃金球</p>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {result.goldenBalls.map((ball) => (
                <div
                  key={ball}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-yellow-300 shadow-md"
                >
                  <span className="text-xs font-bold text-white">{ball}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {result.reasoning}
            </p>
          </div>

          {/* 7項分析 - 一個框連續顯示 */}
          {analysisLines.length > 0 && (
            <div className="border border-border/40 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-secondary/30 border-b border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground">詳細演算分析</p>
              </div>
              <div className="divide-y divide-border/20">
                {analysisLines.map((item, idx) => (
                  <div key={idx} className="px-3 py-2">
                    <span className="text-[10px] font-semibold text-primary/80">
                      {item.icon} {item.label}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 複製按鈕 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={copyResult}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            複製分析報告
          </Button>

          {result.parseErrors && result.parseErrors.length > 0 && (
            <p className="text-[10px] text-orange-400 text-center">
              ⚠ {result.parseErrors.length} 行解析失敗
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
