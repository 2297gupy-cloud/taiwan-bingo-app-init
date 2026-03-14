/**
 * Manus 專案模板導出系統
 * 用於將台灣賓果應用導出為可被其他 Manus 使用者直接使用的完整專案範本
 */

export interface ManusProjectTemplate {
  // 專案基本資訊
  projectInfo: {
    name: string;
    description: string;
    version: string;
    author: string;
    license: string;
    category: "bingo" | "lottery" | "sports" | "finance" | "other";
    tags: string[];
    thumbnail?: string;
    demoUrl?: string;
  };

  // 技術棧配置
  techStack: {
    frontend: {
      framework: "react";
      version: string;
      language: "typescript";
      styling: "tailwindcss";
      uiLibrary: "shadcn/ui";
    };
    backend: {
      framework: "express";
      version: string;
      language: "typescript";
      rpc: "trpc";
      orm: "drizzle";
    };
    database: {
      type: "mysql";
      version: string;
    };
    testing: "vitest";
    buildTool: "vite";
  };

  // 檔案結構
  fileStructure: {
    frontend: string[];
    backend: string[];
    database: string[];
    config: string[];
    scripts: string[];
  };

  // 環境變數範本
  envTemplate: {
    [key: string]: {
      description: string;
      example: string;
      required: boolean;
    };
  };

  // 資料庫配置
  database: {
    tables: Array<{
      name: string;
      description: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        default?: any;
        description?: string;
      }>;
    }>;
    migrations: string[];
  };

  // API 路由配置
  api: {
    baseUrl: string;
    endpoints: Array<{
      path: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      description: string;
      authentication?: "public" | "protected" | "admin";
      requestSchema?: any;
      responseSchema?: any;
    }>;
  };

  // UI 配置
  ui: {
    theme: {
      defaultTheme: "dark" | "light";
      colors: Record<string, string>;
      fonts: Record<string, string>;
    };
    layout: {
      pages: Array<{
        name: string;
        path: string;
        description: string;
        components: string[];
      }>;
      navigation: Array<{
        label: string;
        path: string;
        icon?: string;
      }>;
    };
  };

  // 功能模組
  modules: Array<{
    name: string;
    description: string;
    enabled: boolean;
    files: string[];
    dependencies: string[];
  }>;

  // 安裝和啟動步驟
  setup: {
    prerequisites: string[];
    installSteps: string[];
    configSteps: string[];
    startCommand: string;
    buildCommand: string;
    testCommand: string;
  };

  // 部署配置
  deployment: {
    platform: "manus" | "vercel" | "netlify" | "railway" | "render";
    environmentVariables: string[];
    buildScript: string;
    startScript: string;
  };

  // 文檔
  documentation: {
    readme: string;
    gettingStarted: string;
    apiDocs: string;
    developmentGuide: string;
    deploymentGuide: string;
  };
}

/**
 * 台灣賓果應用完整模板定義
 */
export const taiwanBingoTemplate: ManusProjectTemplate = {
  projectInfo: {
    name: "台灣賓果開獎網",
    description: "完整的台灣賓果即時開獎、AI預測、歷史紀錄、走勢分析應用",
    version: "3.0.0",
    author: "Manus",
    license: "MIT",
    category: "bingo",
    tags: ["bingo", "lottery", "real-time", "ai-prediction", "analytics"],
    demoUrl: "https://3000-iueffzom2ivk2fxzzssed-f1626558.sg1.manus.computer",
  },

  techStack: {
    frontend: {
      framework: "react",
      version: "19.2.1",
      language: "typescript",
      styling: "tailwindcss",
      uiLibrary: "shadcn/ui",
    },
    backend: {
      framework: "express",
      version: "4.21.2",
      language: "typescript",
      rpc: "trpc",
      orm: "drizzle",
    },
    database: {
      type: "mysql",
      version: "8.0+",
    },
    testing: "vitest",
    buildTool: "vite",
  },

  fileStructure: {
    frontend: [
      "client/src/pages/",
      "client/src/components/",
      "client/src/contexts/",
      "client/src/hooks/",
      "client/src/lib/",
      "client/src/App.tsx",
      "client/src/main.tsx",
      "client/src/index.css",
    ],
    backend: [
      "server/routers.ts",
      "server/db.ts",
      "server/ui-config-export.ts",
      "server/ui-config-db.ts",
      "server/_core/",
    ],
    database: [
      "drizzle/schema.ts",
      "drizzle/ui-config-schema.ts",
      "drizzle/migrations/",
    ],
    config: [
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "vitest.config.ts",
      "tailwind.config.ts",
      "postcss.config.mjs",
    ],
    scripts: [
      "seed-data.mjs",
      "init-ui-config.mjs",
    ],
  },

  envTemplate: {
    DATABASE_URL: {
      description: "MySQL 資料庫連接字符串",
      example: "mysql://user:password@localhost:3306/taiwan_bingo",
      required: true,
    },
    JWT_SECRET: {
      description: "JWT 簽名密鑰",
      example: "your-secret-key-here",
      required: true,
    },
    VITE_APP_ID: {
      description: "Manus OAuth 應用 ID",
      example: "app_xxxxx",
      required: true,
    },
    OAUTH_SERVER_URL: {
      description: "Manus OAuth 伺服器 URL",
      example: "https://api.manus.im",
      required: true,
    },
    VITE_OAUTH_PORTAL_URL: {
      description: "Manus OAuth 登入門戶 URL",
      example: "https://oauth.manus.im",
      required: true,
    },
    BUILT_IN_FORGE_API_URL: {
      description: "Manus 內建 API URL",
      example: "https://forge.manus.im",
      required: true,
    },
    BUILT_IN_FORGE_API_KEY: {
      description: "Manus 內建 API 金鑰",
      example: "key_xxxxx",
      required: true,
    },
  },

  database: {
    tables: [
      {
        name: "users",
        description: "使用者表",
        columns: [
          { name: "id", type: "int", nullable: false, description: "主鍵" },
          { name: "openId", type: "varchar(64)", nullable: false, description: "OAuth ID" },
          { name: "name", type: "text", nullable: true, description: "使用者名稱" },
          { name: "email", type: "varchar(320)", nullable: true, description: "電子郵件" },
          { name: "role", type: "enum('user','admin')", nullable: false, default: "user", description: "角色" },
          { name: "createdAt", type: "timestamp", nullable: false, description: "建立時間" },
        ],
      },
      {
        name: "draw_records",
        description: "開獎記錄表",
        columns: [
          { name: "id", type: "int", nullable: false, description: "主鍵" },
          { name: "drawNumber", type: "varchar(20)", nullable: false, description: "期號" },
          { name: "drawTime", type: "bigint", nullable: false, description: "開獎時間" },
          { name: "numbers", type: "json", nullable: false, description: "20個開獎號碼" },
          { name: "superNumber", type: "int", nullable: false, description: "超級獎號" },
          { name: "total", type: "int", nullable: false, description: "總和" },
          { name: "bigSmall", type: "varchar(10)", nullable: false, description: "大小" },
          { name: "oddEven", type: "varchar(10)", nullable: false, description: "單雙" },
        ],
      },
      {
        name: "ai_predictions",
        description: "AI預測表",
        columns: [
          { name: "id", type: "int", nullable: false, description: "主鍵" },
          { name: "targetDrawNumber", type: "varchar(20)", nullable: false, description: "目標期號" },
          { name: "recommendedNumbers", type: "json", nullable: false, description: "推薦號碼" },
          { name: "totalBigSmall", type: "varchar(10)", nullable: false, description: "總和大小" },
          { name: "totalBigSmallConfidence", type: "int", nullable: false, description: "信心度" },
          { name: "overallConfidence", type: "int", nullable: false, description: "整體信心度" },
        ],
      },
      {
        name: "ui_config_templates",
        description: "UI配置範本表",
        columns: [
          { name: "id", type: "int", nullable: false, description: "主鍵" },
          { name: "name", type: "varchar(255)", nullable: false, description: "範本名稱" },
          { name: "version", type: "varchar(20)", nullable: false, description: "版本" },
          { name: "themeConfig", type: "json", nullable: false, description: "主題配置" },
          { name: "layoutConfig", type: "json", nullable: false, description: "佈局配置" },
          { name: "pagesConfig", type: "json", nullable: false, description: "頁面配置" },
          { name: "isPublic", type: "boolean", nullable: false, default: false, description: "是否公開" },
        ],
      },
    ],
    migrations: [
      "0001_initial_schema.sql",
      "0002_ui_config_tables.sql",
    ],
  },

  api: {
    baseUrl: "/api/trpc",
    endpoints: [
      {
        path: "/draw.latest",
        method: "GET",
        description: "獲取最新開獎記錄",
        authentication: "public",
      },
      {
        path: "/draw.recent",
        method: "GET",
        description: "獲取近期開獎記錄",
        authentication: "public",
      },
      {
        path: "/draw.history",
        method: "GET",
        description: "獲取歷史開獎記錄",
        authentication: "public",
      },
      {
        path: "/prediction.latest",
        method: "GET",
        description: "獲取最新AI預測",
        authentication: "public",
      },
      {
        path: "/uiConfig.getTaiwanBingoV2",
        method: "GET",
        description: "獲取完整UI配置",
        authentication: "public",
      },
      {
        path: "/uiConfig.exportAsJSON",
        method: "GET",
        description: "匯出UI配置為JSON",
        authentication: "public",
      },
      {
        path: "/auth.me",
        method: "GET",
        description: "獲取當前使用者資訊",
        authentication: "protected",
      },
      {
        path: "/auth.logout",
        method: "POST",
        description: "登出",
        authentication: "protected",
      },
    ],
  },

  ui: {
    theme: {
      defaultTheme: "dark",
      colors: {
        primary: "oklch(0.78 0.15 85)",
        accent: "oklch(0.65 0.22 25)",
        background: "oklch(0.15 0 0)",
        foreground: "oklch(0.98 0 0)",
      },
      fonts: {
        sans: "system-ui, -apple-system, sans-serif",
      },
    },
    layout: {
      pages: [
        {
          name: "首頁",
          path: "/",
          description: "主要應用頁面，包含即時開獎、AI預測、歷史紀錄、數據分析",
          components: ["LiveDraw", "AIPrediction", "HistoryTable", "DataAnalysis"],
        },
        {
          name: "對獎工具",
          path: "/checker",
          description: "號碼對獎工具",
          components: ["CheckerForm", "CheckerResults"],
        },
        {
          name: "走勢分析",
          path: "/trend",
          description: "走勢分析頁面",
          components: ["TrendCharts"],
        },
      ],
      navigation: [
        { label: "首頁", path: "/" },
        { label: "即時開獎", path: "/#live" },
        { label: "歷史號碼", path: "/#history" },
        { label: "走勢分析", path: "/trend" },
        { label: "對獎工具", path: "/checker" },
      ],
    },
  },

  modules: [
    {
      name: "即時開獎",
      description: "即時開獎顯示和倒數計時",
      enabled: true,
      files: ["client/src/pages/MainPage.tsx", "client/src/components/LiveDraw.tsx"],
      dependencies: ["recharts"],
    },
    {
      name: "AI預測",
      description: "基於歷史數據的AI預測分析",
      enabled: true,
      files: ["client/src/pages/MainPage.tsx", "client/src/components/AIPrediction.tsx"],
      dependencies: ["recharts"],
    },
    {
      name: "歷史紀錄",
      description: "開獎歷史記錄查詢和匯出",
      enabled: true,
      files: ["client/src/pages/MainPage.tsx", "client/src/components/HistoryTable.tsx"],
      dependencies: [],
    },
    {
      name: "走勢分析",
      description: "號碼走勢圖表分析",
      enabled: true,
      files: ["client/src/pages/Trend.tsx"],
      dependencies: ["recharts"],
    },
    {
      name: "對獎工具",
      description: "號碼對獎功能",
      enabled: true,
      files: ["client/src/pages/Checker.tsx"],
      dependencies: [],
    },
  ],

  setup: {
    prerequisites: [
      "Node.js 22.13.0 或更高版本",
      "pnpm 10.4.1 或更高版本",
      "MySQL 8.0 或更高版本",
      "Manus 帳戶和 OAuth 應用",
    ],
    installSteps: [
      "pnpm install",
      "pnpm drizzle-kit generate",
      "執行資料庫遷移 SQL",
      "node seed-data.mjs",
      "node init-ui-config.mjs",
    ],
    configSteps: [
      "設定 .env 環境變數",
      "配置 DATABASE_URL",
      "配置 Manus OAuth 憑證",
      "配置 BUILT_IN_FORGE_API 金鑰",
    ],
    startCommand: "pnpm dev",
    buildCommand: "pnpm build",
    testCommand: "pnpm test",
  },

  deployment: {
    platform: "manus",
    environmentVariables: [
      "DATABASE_URL",
      "JWT_SECRET",
      "VITE_APP_ID",
      "OAUTH_SERVER_URL",
      "VITE_OAUTH_PORTAL_URL",
      "BUILT_IN_FORGE_API_URL",
      "BUILT_IN_FORGE_API_KEY",
    ],
    buildScript: "pnpm build",
    startScript: "pnpm start",
  },

  documentation: {
    readme: "完整的台灣賓果開獎應用，包含即時開獎、AI預測、歷史分析等功能",
    gettingStarted: "參考 GETTING_STARTED.md",
    apiDocs: "參考 API_DOCS.md",
    developmentGuide: "參考 DEVELOPMENT.md",
    deploymentGuide: "參考 DEPLOYMENT.md",
  },
};

/**
 * 生成 Manus 專案模板 JSON
 */
export function generateManusProjectTemplate(template: ManusProjectTemplate): string {
  return JSON.stringify(template, null, 2);
}

/**
 * 生成快速啟動指南
 */
export function generateQuickStartGuide(template: ManusProjectTemplate): string {
  return `
# ${template.projectInfo.name} - 快速啟動指南

## 專案資訊
- **名稱**：${template.projectInfo.name}
- **版本**：${template.projectInfo.version}
- **描述**：${template.projectInfo.description}
- **類別**：${template.projectInfo.category}

## 技術棧
- **前端**：React ${template.techStack.frontend.version} + TypeScript + Tailwind CSS
- **後端**：Express ${template.techStack.backend.version} + tRPC + Drizzle ORM
- **資料庫**：${template.techStack.database.type} ${template.techStack.database.version}
- **測試**：${template.techStack.testing}

## 前置需求
${template.setup.prerequisites.map(p => `- ${p}`).join('\n')}

## 安裝步驟
${template.setup.installSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 環境變數配置
${Object.entries(template.envTemplate).map(([key, val]) => `
### ${key}
- **描述**：${val.description}
- **範例**：\`${val.example}\`
- **必需**：${val.required ? '是' : '否'}
`).join('\n')}

## 啟動應用
\`\`\`bash
${template.setup.startCommand}
\`\`\`

## 構建應用
\`\`\`bash
${template.setup.buildCommand}
\`\`\`

## 執行測試
\`\`\`bash
${template.setup.testCommand}
\`\`\`

## 主要功能模組
${template.modules.filter(m => m.enabled).map(m => `
### ${m.name}
- **描述**：${m.description}
- **檔案**：${m.files.join(', ')}
- **依賴**：${m.dependencies.length > 0 ? m.dependencies.join(', ') : '無'}
`).join('\n')}

## API 端點
${template.api.endpoints.map(e => `
### ${e.method} ${e.path}
- **描述**：${e.description}
- **認證**：${e.authentication || 'public'}
`).join('\n')}

## 資料庫表
${template.database.tables.map(t => `
### ${t.name}
- **描述**：${t.description}
- **欄位數**：${t.columns.length}
`).join('\n')}

## 部署
- **平台**：${template.deployment.platform}
- **構建指令**：\`${template.deployment.buildScript}\`
- **啟動指令**：\`${template.deployment.startScript}\`

## 更多資訊
- Demo：${template.projectInfo.demoUrl}
- 授權：${template.projectInfo.license}
`;
}
