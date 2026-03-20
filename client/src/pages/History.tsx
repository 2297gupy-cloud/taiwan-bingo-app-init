import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import NumberBall from "@/components/NumberBall";
import {
  formatDrawTime,
  getBigSmallLabel,
  getOddEvenLabel,
  getPlateLabel,
  getBigSmallClass,
  getOddEvenClass,
  getPlateClass,
  padNumber,
} from "@/lib/utils";
import { Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function History() {
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<"draw" | "size">("draw");
  const pageSize = 20;

  const { data } = trpc.draw.history.useQuery({ page, pageSize });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.ceil(data.total / pageSize);
  }, [data]);

  const handleExportCSV = () => {
    if (!data?.records.length) return;
    const headers = "期號,時間,開獎號碼,總和,大小,單雙,超級獎號,盤面\n";
    const rows = data.records
      .map((r) => {
        const nums = (r.numbers as number[]).join("-");
        const time = new Date(r.drawTime).toLocaleString("zh-TW");
        return `${r.drawNumber},${time},${nums},${r.total},${getBigSmallLabel(r.bigSmall)},${getOddEvenLabel(r.oddEven)},${r.superNumber},${getPlateLabel(r.plate)}`;
      })
      .join("\n");
    const csv = "\uFEFF" + headers + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bingo_history_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 匯出成功");
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "台灣賓果歷史紀錄", url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("連結已複製到剪貼簿");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold gradient-text">歷史紀錄</h1>
        <p className="text-[10px] text-muted-foreground">歷史開獎紀錄查詢</p>
      </header>

      {/* Actions */}
      <div className="mx-4 mb-3 flex items-center gap-2">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Download className="w-3 h-3" />
          匯出 CSV
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Share2 className="w-3 h-3" />
          分享連結
        </button>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setSortMode("draw")}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              sortMode === "draw"
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            開獎順序
          </button>
          <button
            onClick={() => setSortMode("size")}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              sortMode === "size"
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            大小排序
          </button>
        </div>
      </div>

      {/* Records */}
      <div className="mx-4 mb-4 space-y-2">
        {data?.records.map((draw) => {
          const nums = [...(draw.numbers as number[])];
          const sorted = sortMode === "size" ? nums.sort((a, b) => a - b) : nums;

          return (
            <div key={draw.id} className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold">{draw.drawNumber}</span>
                  {page === 1 && data.records[0]?.id === draw.id && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                      當期
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDrawTime(draw.drawTime)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {sorted.map((num, i) => (
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
                  {draw.total}
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
          );
        })}
      </div>

      {/* Pagination */}
      <div className="mx-4 mb-20 flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground">
          第 {page} / {totalPages} 頁
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
