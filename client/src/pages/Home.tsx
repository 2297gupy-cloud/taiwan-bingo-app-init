import { useLocation } from "wouter";
import { Zap, Clock } from "lucide-react";
import { trpc } from "../lib/trpc";

const quickLinks = [
  { path: "/live", label: "即時開獎", icon: Zap, color: "from-red-500/20 to-red-600/10" },
  { path: "/history", label: "歷史紀錄", icon: Clock, color: "from-blue-500/20 to-blue-600/10" },
];

export function Home() {
  const [, setLocation] = useLocation();
  const { data: latest } = (trpc.draw.latest as any).useQuery({ n: 1 });

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部橫幅 */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-8 text-center">
        <h1 className="text-4xl font-bold mb-2">台灣賓果</h1>
        <p className="text-muted-foreground">實時開獎數據查詢</p>
      </div>

      {/* 最新開獎 */}
      {latest?.data?.[0] && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-bold mb-4">最新開獎</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">期別</span>
                <span className="font-bold">{latest.data[0].period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">時間</span>
                <span>{latest.data[0].date} {latest.data[0].time}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {latest.data[0].numbers?.map((num: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-primary text-primary-foreground rounded">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快速導航 */}
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">功能導航</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => setLocation(link.path)}
                className={`p-4 rounded-lg border border-border bg-gradient-to-br ${link.color} hover:border-primary transition-colors`}
              >
                <Icon className="w-6 h-6 mb-2" />
                <div className="font-semibold">{link.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
