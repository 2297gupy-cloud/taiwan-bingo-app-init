# 台灣賓果應用 - 完整部署指南

## 📋 目錄

- [快速開始](#快速開始)
- [系統要求](#系統要求)
- [完整安裝](#完整安裝)
- [數據庫配置](#數據庫配置)
- [環境變數](#環境變數)
- [一鍵啟動](#一鍵啟動)
- [項目結構](#項目結構)
- [API 文檔](#api-文檔)
- [UI 配置](#ui-配置)
- [常見問題](#常見問題)

## 🚀 快速開始

### 最快方式（推薦）

```bash
# 1. 克隆項目
git clone https://github.com/your-username/taiwan-bingo-app.git
cd taiwan-bingo-app

# 2. 安裝依賴
pnpm install

# 3. 配置環境變數
cp .env.example .env.local
# 編輯 .env.local 填入必要的環境變數

# 4. 初始化數據庫
pnpm run db:migrate
pnpm run db:seed

# 5. 啟動開發服務器
pnpm run dev
```

訪問 `http://localhost:3000` 即可開始使用。

## 💻 系統要求

| 項目 | 最低版本 | 推薦版本 |
|------|---------|---------|
| Node.js | 18.x | 22.x |
| pnpm | 8.x | 9.x |
| MySQL | 5.7 | 8.0+ |
| Git | 2.30+ | 2.40+ |

## 📦 完整安裝

### 步驟 1：克隆項目

```bash
git clone https://github.com/your-username/taiwan-bingo-app.git
cd taiwan-bingo-app
```

### 步驟 2：安裝依賴

```bash
# 使用 pnpm（推薦）
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

### 步驟 3：配置環境變數

```bash
# 複製示例環境變數文件
cp .env.example .env.local

# 編輯環境變數
nano .env.local
```

### 步驟 4：初始化數據庫

```bash
# 生成遷移文件
pnpm run db:generate

# 執行遷移
pnpm run db:migrate

# 填充測試數據（可選）
pnpm run db:seed
```

### 步驟 5：啟動應用

```bash
# 開發模式
pnpm run dev

# 生產構建
pnpm run build
pnpm run start
```

## 🗄️ 數據庫配置

### MySQL 連接字符串格式

```
DATABASE_URL="mysql://username:password@localhost:3306/taiwan_bingo"
```

### 數據庫初始化

應用包含自動遷移系統。首次運行時，系統會自動創建所有必要的表：

- `users` - 用戶表
- `drawRecords` - 開獎記錄
- `aiStarPredictions` - AI一星預測
- `aiSuperPrizePredictions` - AI超級獎預測
- `verificationRecords` - 驗證記錄
- `stats` - 統計數據

### 手動執行 SQL 遷移

如果需要手動執行 SQL：

```bash
# 查看遷移文件
ls drizzle/migrations/

# 使用 MySQL CLI 執行
mysql -u username -p database_name < drizzle/migrations/0001_initial.sql
```

## 🔧 環境變數

### 必需變數

```env
# 數據庫
DATABASE_URL=mysql://user:password@localhost:3306/taiwan_bingo

# OAuth（Manus 平台）
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT 密鑰
JWT_SECRET=your-secret-key-min-32-chars

# API 密鑰
BUILT_IN_FORGE_API_KEY=your_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
```

### 可選變數

```env
# 應用標題和 Logo
VITE_APP_TITLE=台灣賓果開獎網
VITE_APP_LOGO=https://example.com/logo.png

# 分析
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# 開發者信息
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
```

## ⚡ 一鍵啟動

### 使用啟動腳本

```bash
# Linux/Mac
./scripts/start.sh

# Windows
.\scripts\start.bat

# Docker
docker-compose up -d
```

### 啟動腳本功能

1. ✅ 檢查 Node.js 版本
2. ✅ 安裝依賴
3. ✅ 配置環境變數
4. ✅ 初始化數據庫
5. ✅ 啟動開發服務器
6. ✅ 打開瀏覽器

## 📁 項目結構

```
taiwan-bingo-app/
├── client/                      # 前端應用
│   ├── src/
│   │   ├── pages/              # 頁面組件
│   │   │   ├── MainPage.tsx    # 主頁面
│   │   │   ├── AiStarPage.tsx  # AI一星
│   │   │   ├── AiSuperPrizePage.tsx  # AI超級獎
│   │   │   └── ...
│   │   ├── components/         # 可復用組件
│   │   ├── lib/                # 工具函數
│   │   └── index.css           # 全局樣式
│   └── package.json
├── server/                      # 後端應用
│   ├── routers.ts              # tRPC 路由
│   ├── db.ts                   # 數據庫查詢
│   ├── services/               # 業務邏輯
│   └── _core/                  # 核心框架
├── drizzle/                     # 數據庫 Schema
│   ├── schema.ts               # 表定義
│   └── migrations/             # SQL 遷移文件
├── shared/                      # 共享代碼
├── storage/                     # S3 存儲
├── .env.example                # 環境變數示例
├── package.json                # 項目配置
├── tsconfig.json               # TypeScript 配置
└── README.md                   # 項目說明
```

## 🔌 API 文檔

### tRPC 路由

所有 API 端點都通過 tRPC 暴露在 `/api/trpc` 下。

#### 開獎數據 API

```typescript
// 獲取最新開獎
trpc.draw.latest.useQuery()

// 獲取最近 N 期開獎
trpc.draw.recent.useQuery({ limit: 10 })

// 獲取指定期數開獎
trpc.draw.getByNumber.useQuery({ drawNumber: "115015391" })
```

#### AI 預測 API

```typescript
// AI一星預測
trpc.aiStar.analyze.useMutation({
  sourceHour: "08:00",
  targetHour: "09:00",
  samplePeriods: 30
})

// AI超級獎預測
trpc.aiSuperPrize.analyze.useMutation({
  sourceHour: "08:00",
  targetHour: "09:00",
  manualNumbers: [1, 2, 3]
})
```

#### 統計 API

```typescript
// 獲取統計數據
trpc.stats.summary.useQuery({ periods: 20 })

// 獲取準確率統計
trpc.stats.accuracy.useQuery({ days: 7 })
```

#### 外部網站對接 API

```typescript
// 獲取最新開獎
GET /api/trpc/external.getLatestDraws?input={"limit":20}

// 獲取 AI 預測
GET /api/trpc/external.getAIPredictions?input={"limit":15}

// 獲取綜合數據
GET /api/trpc/external.getSummary?input={}
```

## 🎨 UI 配置

### 色彩主題

編輯 `client/src/index.css` 修改全局色彩：

```css
@layer base {
  :root {
    /* 亮色主題 */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.6%;
    --primary: 262 80% 50%;
    --primary-foreground: 210 40% 98%;
    /* ... 更多色彩變數 */
  }

  .dark {
    /* 深色主題 */
    --background: 0 0% 3.6%;
    --foreground: 0 0% 98%;
    --primary: 262 80% 50%;
    /* ... 更多色彩變數 */
  }
}
```

### 字體配置

在 `client/index.html` 中添加 Google Fonts：

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&display=swap" rel="stylesheet">
```

### 響應式設計

應用使用 Tailwind CSS 4 進行響應式設計：

```tsx
// 手機優先
<div className="text-sm md:text-base lg:text-lg">
  響應式文本
</div>
```

## ❓ 常見問題

### Q1：如何修改應用標題和 Logo？

**A：** 編輯 `.env.local`：

```env
VITE_APP_TITLE=我的賓果應用
VITE_APP_LOGO=https://example.com/my-logo.png
```

### Q2：如何添加新的 AI 分析模型？

**A：** 在 `server/services/` 中創建新服務，然後在 `server/routers.ts` 中添加新的 tRPC 過程。

### Q3：如何自定義色彩主題？

**A：** 編輯 `client/src/index.css` 中的 CSS 變數。

### Q4：如何部署到生產環境？

**A：** 使用 Manus 平台的一鍵發布功能，或按照 Docker 部署指南。

### Q5：如何備份數據庫？

**A：** 使用 MySQL 備份工具：

```bash
mysqldump -u username -p database_name > backup.sql
```

### Q6：如何處理 API 錯誤？

**A：** 所有 API 錯誤都會通過 tRPC 的錯誤處理系統返回。檢查瀏覽器控制台查看詳細錯誤信息。

## 📞 支持和反饋

- 📧 Email: support@example.com
- 💬 Discord: https://discord.gg/example
- 🐛 Bug Report: https://github.com/your-username/taiwan-bingo-app/issues
- 💡 Feature Request: https://github.com/your-username/taiwan-bingo-app/discussions

## 📄 許可證

MIT License - 詳見 LICENSE 文件

## 🙏 致謝

感謝所有貢獻者和使用者的支持！
