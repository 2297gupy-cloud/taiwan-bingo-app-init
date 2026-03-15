import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import NumberBall from "@/components/NumberBall";
import DataControlPanel from "@/components/DataControlPanel";
import {
  formatDrawTime,
  getBigSmallLabel,
  getOddEvenLabel,
  getPlateLabel,
  getBigSmallClass,
  getOddEvenClass,
  padNumber,
} from "@/lib/utils";
import { Zap, Clock, TrendingUp, CheckCircle, Brain, BarChart3 } from "lucide-react";

const quickLinks = [
  { path: "/live", label: "即時開獎", icon: Zap, color: "from-red-500/20 to-red-600/10" },
  { path: "/history", label: "歷史紀錄", icon: Clock, color: "from-blue-500/20 to-blue-600/10" },
  { path: "/trend", label: "走勢分析", icon: TrendingUp, color: "from-green-500/20 to-green-600/10" },
  { path: "/checker", label: "對獎工具", icon: CheckCircle, color: "from-purple-500/20 to-purple-600/10" },
  { path: "/ai", label: "AI預測", icon: Brain, color: "from-yellow-500/20 to-yellow-600/10" },
  { path: "/stats", label: "統計分析", icon: BarChart3, color: "from-cyan-500/20 to-cyan-600/10" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: latest } = trpc.draw.latest.useQuery();

  return (
    <div className="min-h-screen">
      {/* 數據控制面板 */}
      <DataControlPanel />

      {/* Header */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            B
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">台灣賓果開獎網</h1>
            <p className="text-[10px] text-muted-foreground tracking-wider">TAIWAN BINGO</p>
          </div>
        </div>
      </header>

      {/* Announcement */}
      <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-card border border-border">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary mr-1">📢</span>
          系統公告：每5分鐘開獎一次，全天候不間斷！
        </p>
      </div>

      {/* Latest Draw */}
      {latest && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">最新開獎</p>
              <p className="text-sm font-mono font-bold text-foreground">
                No. {latest.drawNumber}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDrawTime(latest.drawTime)}
              </p>
            </div>
            <button
              onClick={() => setLocation("/live")}
              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
            >
              查看詳情
            </button>
          </div>

          {/* Numbers grid */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(latest.numbers as number[]).map((num, i) => (
              <NumberBall
                key={i}
                number={num}
                isSuper={num === latest.superNumber}
              />
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              總和 <span className="font-bold text-foreground">{latest.total}</span>
            </span>
            <span className="text-muted-foreground">
              大小 <span className={`font-bold ${getBigSmallClass(latest.bigSmall)}`}>
                {getBigSmallLabel(latest.bigSmall)}
              </span>
            </span>
            <span className="text-muted-foreground">
              單雙 <span className={`font-bold ${getOddEvenClass(latest.oddEven)}`}>
                {getOddEvenLabel(latest.oddEven)}
              </span>
            </span>
            <span className="text-muted-foreground">
              超級 <span className="font-bold text-destructive">
                {padNumber(latest.superNumber)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mx-4 mb-4">
        <h2 className="text-sm font-semibold mb-3 text-foreground">功能導覽</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => setLocation(link.path)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all active:scale-95"
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${link.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mx-4 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          © 2026 台灣賓果開獎網. 本網站僅供參考。
        </p>
      </div>
    </div>
  );
}
