import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Sparkles, ChevronDown, ChevronUp, Copy, ClipboardPaste } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import NumberBall from "@/components/NumberBall";

const SAMPLE_DATA = `115014950
17:55	06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79	超級獎67	大	單
115014949
17:50	04 05 08 19 21 23 27 28 35 38 49 52 54 62 63 64 65 66 69 76	超級獎23	大	雙
115014948
17:45	06 08 09 11 12 15 19 23 30 32 39 44 48 49 56 57 60 63 65 75	超級獎09	小	單
115014947
17:40	11 14 16 18 20 23 29 31 40 41 43 49 50 58 59 63 64 67 72 74	超級獎49	大	雙
115014946
17:35	05 06 12 13 16 24 25 26 27 29 34 38 43 48 59 69 70 74 79 80	超級獎05	小	單
115014945
17:30	02 09 10 14 20 22 24 28 40 41 42 49 50 53 61 72 73 75 76 77	超級獎53	大	雙
115014944
17:25	02 04 08 09 11 14 23 24 29 31 33 39 53 55 61 64 67 71 74 80	超級獎09	小	雙
115014943
17:20	03 04 05 09 12 13 16 17 31 33 45 52 54 57 64 65 68 72 74 77	超級獎52	小	單
115014942
17:15	03 05 06 09 12 15 16 18 19 23 24 25 29 30 33 43 45 68 71 75	超級獎06	小	單
115014941
17:10	07 10 15 18 23 28 35 37 39 46 48 49 50 58 59 62 65 67 68 79	超級獎07	大	單
115014940
17:05	01 05 08 09 12 17 19 23 26 33 38 48 53 55 61 65 69 74 75 79	超級獎09	小	單
115014939
17:00	06 08 09 15 22 25 27 28 29 30 31 32 33 34 42 43 49 52 60 73	超級獎22	小	雙`;

interface AnalysisResult {
  goldenBalls: number[];
  reasoning: string;
  hotAnalysis: string;
  coldAnalysis: string;
  trendAnalysis: string;
  tailResonance: string;
  streakAnalysis: string;
  diagonalAnalysis: string;
  deadNumbers: string;
  coreConclusion: string;
  strategy: string;
  sampleCount: number;
  usedLLM: boolean;
  parseErrors: string[];
}

export default function AiCustomAnalyzePage() {
  const [searchParams] = useSearchParams();
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const analyzeMutation = trpc.aiStar.analyzeCustomDataFull.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.goldenBalls.length === 0) {
        toast.error("無法解析輸入的數據，請確認格式正確");
      } else {
        toast.success(`AI 演算完成！分析 ${data.sampleCount} 期數據`);
      }
    },
    onError: (err) => {
      const isApiKeyError = err.message.includes("401") || err.message.includes("invalid_api_key") || err.message.includes("Incorrect API key");
      if (isApiKeyError) {
        toast.error(`❌ API Key 無效！請到 API Key 設定更换有效的 Key。`, {
          duration: 5000,
        });
      } else {
        toast.error(`演算失敗：${err.message}`);
      }
    },
  });

  // 自動載入 URL 參數中的數據
  useEffect(() => {
    const data = searchParams.get("rawData");
    const autoAnalyze = searchParams.get("autoAnalyze");
    if (data) {
      const decodedData = decodeURIComponent(data);
      setRawText(decodedData);
      if (autoAnalyze === "1") {
        setTimeout(() => {
          if (decodedData.trim()) {
            analyzeMutation.mutate({ rawText: decodedData.trim() });
          }
        }, 800);
      }
    }
  }, [searchParams]);

  const handleAnalyze = () => {
    if (!rawText.trim()) {
      toast.error("請先貼入開獎數據");
      return;
    }
    analyzeMutation.mutate({ rawText: rawText.trim() });
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_DATA);
    toast.success("已載入範例數據（115/03/15 17:00-17:55）");
  };

  const handlePaste = async () => {
    try {
      // 檢查瀏覽器是否支援 Clipboard API
      if (!navigator.clipboard) {
        toast.error("您的瀏覽器不支援剪貼簿功能，請手動貼入");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.warning("剪貼簿為空，請先複製開獎數據");
        return;
      }
      setRawText(text);
      toast.success("已從剪貼簿貼入數據");
    } catch (err: any) {
      // 詳細的錯誤處理
      if (err.name === "NotAllowedError") {
        toast.error("需要剪貼簿權限。請在瀏覽器設定中允許此網站存取剪貼簿");
      } else if (err.name === "NotFoundError") {
        toast.warning("剪貼簿為空，請先複製開獎數據");
      } else {
        toast.error("無法讀取剪貼簿，請手動貼入");
      }
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyResult = () => {
    if (!result) return;
    const text = [
      `🎯 AI 演算黃金球：${result.goldenBalls.map(n => String(n).padStart(2,'0')).join(', ')}`,
      `📊 分析期數：${result.sampleCount} 期`,
      `💡 核心結論：${result.reasoning}`,
      ``,
      `1. 強勢熱號 + 尾數共振：${result.hotAnalysis}`,
      `2. 連莊號分析：${result.streakAnalysis}`,
      `3. 斜連交會點：${result.diagonalAnalysis}`,
      `4. 死碼排除：${result.deadNumbers}`,
      `5. 冷號回補：${result.coldAnalysis}`,
      `6. 區間趨勢：${result.trendAnalysis}`,
      `7. 核心演算結論：${result.coreConclusion}`,
      ``,
      `整體策略：${result.strategy}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => toast.success("已複製分析結果"));
  };

  const analysisItems = result ? [
    { key: "hot", label: "1. 強勢熱號 + 尾數共振偵測", content: result.hotAnalysis, tailNote: result.tailResonance },
    { key: "streak", label: "2. 穩定連莊號分析", content: result.streakAnalysis },
    { key: "diagonal", label: "3. 斜連交會點", content: result.diagonalAnalysis },
    { key: "dead", label: "4. 死碼排除", content: result.deadNumbers },
    { key: "cold", label: "5. 冷號回補分析", content: result.coldAnalysis },
    { key: "trend", label: "6. 區間分布趨勢", content: result.trendAnalysis },
    { key: "core", label: "7. 核心演算結論（5期策略）", content: result.coreConclusion, highlight: true },
  ] : [];

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">AI 專業演算分析</h2>
        <Badge variant="outline" className="text-[10px] text-primary border-primary/50">7項演算</Badge>
      </div>

      {/* 說明 */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">使用方式：</p>
        <p>1. 複製任意時段的開獎數據（如從 BINGO BINGO 演算報告複製）</p>
        <p>2. 貼入下方文字框，點擊「開始 AI 演算」</p>
        <p>3. AI 將按照 7 個專業演算要點分析，輸出三顆黃金球</p>
      </div>

      {/* 輸入區 */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">貼入開獎數據</CardTitle>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handlePaste}
              >
                <ClipboardPaste className="w-3 h-3 mr-1" />
                貼上
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handleLoadSample}
              >
                範例
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`貼入開獎數據，支援以下格式：\n\n115014950\n17:55\t06 18 25 31 33 37 40 44 52 55 60 61 62 64 67 69 74 75 77 79\t超級獎67\t大\t單\n115014949\n17:50\t04 05 08 19 21 23 27 28 35 38 49 52 54 62 63 64 65 66 69 76\t超級獎23\t大\t雙\n...`}
            className="min-h-[160px] text-xs font-mono resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {rawText ? `已輸入 ${rawText.split('\n').filter(l => l.trim()).length} 行` : "支援台灣賓果演算報告格式"}
            </span>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !rawText.trim()}
              className="h-8 text-xs px-4 bg-primary hover:bg-primary/90"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  AI 演算中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  開始 AI 演算
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 結果顯示 */}
      {result && result.goldenBalls.length > 0 && (
        <div className="space-y-3">
          {/* 黃金球結果 */}
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-foreground">AI 演算黃金球</span>
                  <Badge variant="outline" className="text-[10px]">
                    {result.usedLLM ? "AI 智能演算" : "統計備用方案"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={copyResult}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  複製
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {result.goldenBalls.map((ball) => (
                  <NumberBall key={ball} number={ball} size="lg" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground bg-background/60 rounded p-2">
                {result.reasoning}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-muted-foreground">分析期數：{result.sampleCount} 期</span>
                {result.parseErrors.length > 0 && (
                  <span className="text-[10px] text-orange-400">⚠ {result.parseErrors.length} 行解析失敗</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 7項演算詳細分析 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground px-1">詳細演算分析</p>
            {analysisItems.map((item) => (
              <Card
                key={item.key}
                className={`border-border/40 ${item.highlight ? 'border-primary/40 bg-primary/5' : ''}`}
              >
                <button
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left"
                  onClick={() => toggleSection(item.key)}
                >
                  <span className={`text-xs font-semibold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                  {expandedSections[item.key]
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {expandedSections[item.key] && (
                  <CardContent className="px-3 pb-3 pt-0">
                    {item.tailNote && (
                      <p className="text-[10px] text-primary/80 bg-primary/10 rounded px-2 py-1 mb-2">
                        尾數共振：{item.tailNote}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {item.content || "（無資料）"}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* 整體策略 */}
          {result.strategy && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="px-3 py-3">
                <p className="text-xs font-semibold text-yellow-400 mb-1">整體選號策略</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.strategy}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 空狀態 */}
      {!result && !analyzeMutation.isPending && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">貼入開獎數據後點擊「開始 AI 演算」</p>
          <p className="text-[10px] mt-1 opacity-60">AI 將按照 7 個專業演算要點分析</p>
        </div>
      )}
    </div>
  );
}
