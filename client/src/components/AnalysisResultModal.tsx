import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import NumberBall from "@/components/NumberBall";
import { Copy, ChevronUp, ChevronDown, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AnalysisResult {
  goldenBalls: number[];
  reasoning: string;
  usedLLM?: boolean;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hotAnalysis: true,
    coldAnalysis: false,
    trendAnalysis: false,
    strategy: false,
  });

  if (!result) return null;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyResult = () => {
    const text = `🎯 推薦黃金球: ${result.goldenBalls.join(", ")}
💡 ${result.reasoning}
${result.hotAnalysis ? `\n🔥 強勢熱號: ${result.hotAnalysis}` : ""}
${result.coldAnalysis ? `\n❄️ 冷號回補: ${result.coldAnalysis}` : ""}
${result.trendAnalysis ? `\n📈 趨勢分析: ${result.trendAnalysis}` : ""}
${result.strategy ? `\n🎯 整體策略: ${result.strategy}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("分析報告已複製");
  };

  const analysisItems = [
    {
      key: "hotAnalysis",
      label: "🔥 強勢熱號 + 尾數共振",
      content: result.hotAnalysis,
      highlight: true,
      tailNote: result.tailNote,
    },
    {
      key: "coldAnalysis",
      label: "❄️ 冷號回補機會",
      content: result.coldAnalysis,
      highlight: false,
    },
    {
      key: "trendAnalysis",
      label: "📈 趨勢分析 & 區間分布",
      content: result.trendAnalysis,
      highlight: false,
    },
    {
      key: "strategy",
      label: "🎯 整體選號策略",
      content: result.strategy,
      highlight: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <div>
                <DialogTitle className="text-base font-bold">
                  {title || "AI 專業演算分析報告"}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {sourceHour && targetHour && `${sourceHour}時段數據 → 預測 ${targetHour}時段`}
                  {result.sampleCount && ` • 分析 ${result.sampleCount} 期數據`}
                  {result.usedLLM !== undefined && ` • ${result.usedLLM ? "AI 智能演算" : "統計備用方案"}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 黃金球顯示 */}
          <div className="bg-gradient-to-br from-primary/8 to-primary/3 rounded-lg p-4 border border-primary/20">
            <p className="text-[10px] text-muted-foreground font-semibold mb-3">🎯 推薦黃金球</p>
            <div className="flex items-center gap-3 mb-3">
              {result.goldenBalls.map((ball) => (
                <div key={ball} className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-yellow-300 shadow-lg">
                  <span className="text-sm font-bold text-white">{ball}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 {result.reasoning}
            </p>
            {result.parseErrors && result.parseErrors.length > 0 && (
              <p className="text-[10px] text-orange-400 mt-2">
                ⚠ {result.parseErrors.length} 行解析失敗
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-7 text-xs px-2"
              onClick={copyResult}
            >
              <Copy className="w-3 h-3 mr-1" />
              複製報告
            </Button>
          </div>

          {/* 7項詳細分析 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground px-1">詳細演算分析</p>
            {analysisItems.map((item) => (
              <div
                key={item.key}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  item.highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/40"
                }`}
              >
                <button
                  className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-background/60 transition-colors"
                  onClick={() => toggleSection(item.key)}
                >
                  <span
                    className={`text-xs font-semibold ${
                      item.highlight ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  {expandedSections[item.key] ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedSections[item.key] && (
                  <div className="px-3 pb-2.5 pt-0 border-t border-border/20 bg-background/30">
                    {item.tailNote && (
                      <p className="text-[10px] text-primary/80 bg-primary/10 rounded px-2 py-1.5 mb-2">
                        🔍 尾數共振：{item.tailNote}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {item.content || "（無資料）"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
