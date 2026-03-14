/**
 * UI 配置匯出工具
 * 用於將台灣賓果 APP 的完整介面配置匯出為可重用的範本
 */

export interface UIConfigExport {
  name: string;
  version: string;
  appType: string;
  description: string;
  themeConfig: {
    defaultTheme: "dark" | "light";
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  layoutConfig: {
    headerHeight: number;
    footerHeight: number;
    sidebarWidth?: number;
    hasTabBar: boolean;
    tabBarPosition: "top" | "bottom";
  };
  pagesConfig: Array<{
    id: string;
    name: string;
    path: string;
    title: string;
    icon?: string;
    sections: Array<{
      id: string;
      type: string;
      title?: string;
      props: Record<string, any>;
    }>;
  }>;
  navigationConfig: {
    items: Array<{
      id: string;
      label: string;
      icon?: string;
      path?: string;
    }>;
    quickActions?: Array<{
      id: string;
      label: string;
      icon?: string;
    }>;
  };
  componentLibrary: {
    buttons: Record<string, any>;
    cards: Record<string, any>;
    inputs: Record<string, any>;
    modals: Record<string, any>;
    [key: string]: Record<string, any>;
  };
  apiConfig: {
    endpoints: Array<{
      name: string;
      path: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      description?: string;
    }>;
  };
  databaseConfig: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
    }>;
  };
}

/**
 * 台灣賓果 APP V2 完整 UI 配置
 */
export const taiwanBingoV2Config: UIConfigExport = {
  name: "台灣賓果開獎網 V2",
  version: "2.0.0",
  appType: "bingo",
  description: "台灣賓果即時開獎、AI預測、歷史紀錄、走勢分析完整應用",
  
  themeConfig: {
    defaultTheme: "dark",
    primaryColor: "oklch(0.78 0.15 85)", // 金色
    accentColor: "oklch(0.65 0.22 25)", // 紅色
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  
  layoutConfig: {
    headerHeight: 80,
    footerHeight: 56,
    hasTabBar: true,
    tabBarPosition: "bottom",
  },
  
  pagesConfig: [
    {
      id: "main",
      name: "MainPage",
      path: "/",
      title: "首頁",
      sections: [
        {
          id: "header",
          type: "SiteHeader",
          props: {
            sticky: true,
            hasQuickNav: true,
          },
        },
        {
          id: "announcement",
          type: "Announcement",
          props: {
            icon: "📢",
            bgColor: "primary/10",
          },
        },
        {
          id: "tab-switcher",
          type: "SectionTabs",
          props: {
            tabs: [
              { key: "live", label: "即時開獎" },
              { key: "ai", label: "AI 預測" },
              { key: "history", label: "歷史號碼" },
            ],
          },
        },
        {
          id: "live-draw",
          type: "LiveDraw",
          props: {
            refetchInterval: 10000,
            showCountdown: true,
            showSortToggle: true,
          },
        },
        {
          id: "ai-prediction",
          type: "AIPrediction",
          props: {
            showConfidence: true,
            showSampleSize: true,
          },
        },
        {
          id: "history-table",
          type: "HistorySection",
          props: {
            pageSize: 10,
            showExportCSV: true,
            showShare: true,
          },
        },
        {
          id: "data-analysis",
          type: "DataAnalysis",
          props: {
            periods: [20, 50, 100],
            defaultPeriod: 20,
            charts: ["total-trend", "hot-numbers", "big-small", "odd-even"],
          },
        },
        {
          id: "scroll-to-top",
          type: "ScrollToTopButton",
          props: {
            threshold: 300,
          },
        },
      ],
    },
    {
      id: "checker",
      name: "Checker",
      path: "/checker",
      title: "對獎工具",
      sections: [
        {
          id: "header",
          type: "PageHeader",
          props: {
            title: "對獎工具",
            showBackButton: true,
          },
        },
        {
          id: "checker-form",
          type: "CheckerForm",
          props: {
            maxNumbers: 20,
            minNumber: 1,
            maxNumber: 80,
          },
        },
        {
          id: "checker-results",
          type: "CheckerResults",
          props: {
            showMatchCount: true,
            showMatchedNumbers: true,
          },
        },
      ],
    },
    {
      id: "trend",
      name: "Trend",
      path: "/trend",
      title: "走勢分析",
      sections: [
        {
          id: "header",
          type: "PageHeader",
          props: {
            title: "走勢分析",
            showBackButton: true,
          },
        },
        {
          id: "trend-charts",
          type: "TrendCharts",
          props: {
            periods: [20, 50, 100],
            defaultPeriod: 20,
            chartTypes: ["line", "bar"],
          },
        },
      ],
    },
  ],
  
  navigationConfig: {
    items: [
      { id: "home", label: "首頁", icon: "🏠", path: "/" },
      { id: "live", label: "即時開獎", icon: "⏱", path: "/#live" },
      { id: "history", label: "歷史號碼", icon: "📋", path: "/#history" },
      { id: "trend", label: "走勢分析", icon: "📈", path: "/trend" },
      { id: "checker", label: "對獎工具", icon: "✓", path: "/checker" },
      { id: "ai", label: "AI預測", icon: "🤖", path: "/#ai" },
      { id: "stats", label: "統計分析", icon: "📊", path: "/#stats" },
    ],
    quickActions: [
      { id: "rules", label: "規則說明", icon: "ℹ️" },
      { id: "news", label: "最新資訊", icon: "🔥" },
    ],
  },
  
  componentLibrary: {
    buttons: {
      primary: {
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
        sizes: { sm: "px-2 py-1 text-xs", md: "px-3 py-2 text-sm", lg: "px-4 py-3 text-base" },
      },
      outline: {
        className: "border border-border text-foreground hover:bg-secondary/20",
        sizes: { sm: "px-2 py-1 text-xs", md: "px-3 py-2 text-sm", lg: "px-4 py-3 text-base" },
      },
    },
    cards: {
      default: {
        className: "rounded-lg bg-card border border-border p-4",
      },
      elevated: {
        className: "rounded-lg bg-card border border-border p-4 shadow-lg",
      },
    },
    inputs: {
      text: {
        className: "rounded border border-border bg-background px-3 py-2 text-sm",
      },
      number: {
        className: "rounded border border-border bg-background px-3 py-2 text-sm",
        min: 1,
        max: 80,
      },
    },
    modals: {
      default: {
        className: "fixed inset-0 z-50 flex items-center justify-center",
        overlay: "bg-black/50",
        content: "bg-card rounded-lg p-6 max-w-md",
      },
    },
  },
  
  apiConfig: {
    endpoints: [
      { name: "draw.latest", path: "/api/trpc/draw.latest", method: "GET", description: "獲取最新開獎記錄" },
      { name: "draw.recent", path: "/api/trpc/draw.recent", method: "GET", description: "獲取近期開獎記錄" },
      { name: "draw.history", path: "/api/trpc/draw.history", method: "GET", description: "獲取歷史開獎記錄" },
      { name: "stats.summary", path: "/api/trpc/stats.summary", method: "GET", description: "獲取統計摘要" },
      { name: "prediction.latest", path: "/api/trpc/prediction.latest", method: "GET", description: "獲取最新 AI 預測" },
      { name: "prediction.recent", path: "/api/trpc/prediction.recent", method: "GET", description: "獲取近期 AI 預測" },
      { name: "checker.check", path: "/api/trpc/checker.check", method: "POST", description: "對獎檢查" },
    ],
  },
  
  databaseConfig: {
    tables: [
      {
        name: "draw_records",
        columns: [
          { name: "id", type: "int", required: true },
          { name: "drawNumber", type: "varchar", required: true },
          { name: "drawTime", type: "bigint", required: true },
          { name: "numbers", type: "json", required: true },
          { name: "superNumber", type: "int", required: true },
          { name: "total", type: "int", required: true },
          { name: "bigSmall", type: "varchar", required: true },
          { name: "oddEven", type: "varchar", required: true },
          { name: "plate", type: "varchar", required: true },
        ],
      },
      {
        name: "ai_predictions",
        columns: [
          { name: "id", type: "int", required: true },
          { name: "targetDrawNumber", type: "varchar", required: true },
          { name: "recommendedNumbers", type: "json", required: true },
          { name: "totalBigSmall", type: "varchar", required: true },
          { name: "totalBigSmallConfidence", type: "int", required: true },
          { name: "totalOddEven", type: "varchar", required: true },
          { name: "totalOddEvenConfidence", type: "int", required: true },
          { name: "superBigSmall", type: "varchar", required: true },
          { name: "superBigSmallConfidence", type: "int", required: true },
          { name: "superOddEven", type: "varchar", required: true },
          { name: "superOddEvenConfidence", type: "int", required: true },
          { name: "platePrediction", type: "varchar", required: true },
          { name: "plateConfidence", type: "int", required: true },
          { name: "sampleSize", type: "int", required: true },
          { name: "overallConfidence", type: "int", required: true },
        ],
      },
    ],
  },
};

/**
 * 匯出 UI 配置為 JSON 字符串
 */
export function exportUIConfigAsJSON(config: UIConfigExport): string {
  return JSON.stringify(config, null, 2);
}

/**
 * 匯出 UI 配置為 TypeScript 類型定義
 */
export function exportUIConfigAsTS(config: UIConfigExport): string {
  return `
export const uiConfig = ${JSON.stringify(config, null, 2)} as const;

export type UIConfig = typeof uiConfig;
`;
}
