import { useLocation } from "wouter";
import { Home, Zap, Clock, TrendingUp, Brain, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "home", path: "/", anchor: "#top", label: "首頁", icon: Home },
  { id: "live", path: "/", anchor: "#live", label: "即時開獎", icon: Zap },
  { id: "history", path: "/", anchor: "#history", label: "歷史號碼", icon: Clock },
  { id: "trend", path: "/trend", anchor: null, label: "走勢分析", icon: TrendingUp },

  { id: "ai", path: "/", anchor: "#ai", label: "AI預測", icon: Brain },
  { id: "stats", path: "/", anchor: "#stats", label: "統計分析", icon: BarChart3 },
];

export default function TabBar() {
  const [location, setLocation] = useLocation();

  const handleClick = (tab: typeof tabs[0]) => {
    if (tab.anchor) {
      // 如果在首頁，直接滾動到錨點
      if (location === "/") {
        const el = document.querySelector(tab.anchor);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      // 不在首頁，先導航到首頁再滾動
      setLocation("/");
      setTimeout(() => {
        const el = document.querySelector(tab.anchor!);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      setLocation(tab.path);
    }
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.path !== "/" && location === tab.path) return true;
    if (tab.path === "/" && location === "/" && tab.id === "home") return true;
    return false;
  };

  return (
    <nav className="tab-bar">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              className={cn(
                "flex flex-col items-center justify-center flex-shrink-0 py-1.5 px-2.5 min-w-[3.2rem] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 mb-0.5", active && "drop-shadow-[0_0_6px_oklch(0.78_0.15_85)]")} />
              <span className="text-[9px] font-medium leading-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
