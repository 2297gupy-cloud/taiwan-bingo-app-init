# 台灣賓果 2026 - AI 智能預測平台

> 一個結合台灣彩券開獎數據、AI 智能分析與實時驗證的現代化賓果預測平台。

## 📋 項目概述

**台灣賓果 2026** 是一個全棧 Web 應用程式，專為台灣彩券賓果遊戲設計。該平台整合了實時開獎數據、AI 驅動的黃金球預測、歷史數據分析與命中率追蹤等功能，幫助玩家做出更明智的投注決策。

### 核心特性

該應用程式提供了以下主要功能模塊：

**即時開獎模塊**：實時顯示當期開獎號碼、超級獎號、大小與單雙統計，並提供倒數計時器顯示下期開獎時間。用戶可查看最近 50 期的開獎歷史記錄，並支援 CSV 匯出功能。

**AI 一星預測模塊**：系統每天自動分析 15 個時段（08:00~22:00），使用 LLM（大語言模型）或統計演算法預測各時段的黃金球號碼。每個時段卡片展示預測號碼、數字分布矩陣與分析說明，並支援一鍵全部分析、清除與日期切換功能。

**驗證與命中率追蹤**：系統自動驗證每個時段的預測結果，計算命中率統計（三星入袋、四星報喜等），並支援 7 天歷史分析記錄查詢。用戶可查看每日各時段的黃金球分析與對應的開獎驗證詳情。

**數據分析與統計**：提供號碼頻率分析、走勢圖表、大小/單雙比例統計等多維度數據可視化，幫助用戶發現開獎規律。

**Google Sheets 數據同步**：系統支援從 Google 試算表同步歷史開獎數據，管理員可手動選擇日期同步指定日期的完整開獎記錄。

## 🏗️ 技術架構

該應用程式採用現代化的全棧架構，前後端分離設計：

| 層級 | 技術棧 | 說明 |
|------|--------|------|
| **前端** | React 19 + Tailwind CSS 4 + TypeScript | 響應式 UI，支援深色主題與行動端適配 |
| **後端** | Express 4 + tRPC 11 + Node.js | 類型安全的 RPC 框架，自動生成客戶端類型 |
| **資料庫** | MySQL/TiDB + Drizzle ORM | 關係型資料庫，支援 ORM 查詢與自動遷移 |
| **AI 集成** | Manus Forge API（LLM） | 內建 OpenAI/Gemini 兼容的 LLM 服務 |
| **測試** | Vitest | 單元測試與集成測試框架 |
| **部署** | Manus 平台 | 一鍵部署、自動 SSL、自定義域名支援 |

### 核心模塊

**前端結構**（`client/src/`）：

- `pages/` - 主要頁面組件（AiStarPage、MainPage 等）
- `components/` - 可重用 UI 組件（DashboardLayout、AIChatBox 等）
- `lib/trpc.ts` - tRPC 客戶端配置
- `App.tsx` - 路由與全局佈局

**後端結構**（`server/`）：

- `routers.ts` - 所有 tRPC 程序定義
- `db.ts` - 資料庫查詢助手函數
- `services/` - 業務邏輯模塊（ai-star-strategy、google-sheets-sync 等）
- `_core/` - 框架級別的核心功能（OAuth、LLM、存儲等）

**資料庫架構**（`drizzle/schema.ts`）：

系統包含以下主要表格：

| 表格 | 用途 | 關鍵字段 |
|------|------|---------|
| `draw_records` | 開獎記錄 | drawNumber（期號）、drawTime（開獎時間）、numbers（20 顆號碼）、superNumber（超級獎）|
| `ai_star_predictions` | AI 預測記錄 | date、hour、goldenBall（黃金球）、analysis（分析說明）|
| `ai_star_verification_records` | 驗證結果 | date、hour、goldenBall、hits（命中期數）、hitRate（命中率）|
| `users` | 用戶信息 | openId、name、role（admin/user）|

## 🚀 快速開始

### 前置要求

在部署前，請確保您已準備好以下資源：

- **Manus 帳戶**：用於部署與管理應用程式
- **MySQL/TiDB 資料庫**：用於存儲開獎數據與預測記錄
- **Google Apps Script API**：用於同步 Google 試算表中的歷史開獎數據
- **LLM API 金鑰**（可選）：用於 AI 黃金球預測（支援 OpenAI、Gemini 等）

### 環境配置

系統使用以下環境變數進行配置。這些變數由 Manus 平台自動注入，無需手動設定：

| 環境變數 | 說明 |
|---------|------|
| `DATABASE_URL` | MySQL/TiDB 連接字符串 |
| `JWT_SECRET` | 會話 Cookie 簽署密鑰 |
| `VITE_APP_ID` | Manus OAuth 應用 ID |
| `OAUTH_SERVER_URL` | Manus OAuth 伺服器 URL |
| `VITE_OAUTH_PORTAL_URL` | Manus 登入門戶 URL |
| `BUILT_IN_FORGE_API_URL` | Manus 內建 API 基礎 URL |
| `BUILT_IN_FORGE_API_KEY` | Manus 內建 API 金鑰（後端） |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus 內建 API 金鑰（前端） |

### 本地開發

若要在本地開發環境中運行應用程式，請執行以下步驟：

**1. 克隆項目並安裝依賴**

```bash
git clone <repository-url>
cd taiwan-bingo-app-init
pnpm install
```

**2. 配置資料庫**

確保 `DATABASE_URL` 環境變數指向有效的 MySQL/TiDB 伺服器。您可以在 `.env.local` 文件中設定（本地開發用）：

```bash
DATABASE_URL="mysql://user:password@localhost:3306/taiwan_bingo"
```

**3. 執行資料庫遷移**

```bash
pnpm run db:push
```

此命令將建立所有必要的表格與索引。

**4. 啟動開發伺服器**

```bash
pnpm run dev
```

應用程式將在 `http://localhost:3000` 啟動。前端使用 Vite 進行熱模塊替換（HMR），後端使用 tsx watch 進行自動重載。

### 部署到 Manus

**1. 建立 Checkpoint**

在 Manus 管理介面中，點擊「Publish」按鈕前，系統會自動提示建立 Checkpoint。Checkpoint 是應用程式的快照，用於版本控制與回滾。

**2. 發佈應用程式**

點擊「Publish」按鈕，Manus 將自動執行以下步驟：

- 構建前端資源（Vite 打包）
- 編譯後端代碼（esbuild）
- 執行資料庫遷移
- 啟動應用程式伺服器

**3. 配置自定義域名**

在 Manus 管理介面的「Settings」→「Domains」中，您可以購買新域名或綁定現有域名。系統將自動配置 SSL 憑證。

## 📖 使用指南

### 用戶界面導航

應用程式採用底部 Tab 導航設計，主要分頁包括：

**即時開獎**：顯示當期開獎號碼、倒數計時與最近 50 期歷史記錄。

**AI 預測**：展示 AI 預測的號碼建議、各維度分析與命中率統計。

**AI 一星**：展示 15 個時段的黃金球預測卡片、分析說明與驗證結果。支援日期切換、一鍵分析、手動同步 Google 數據等功能。

**歷史號碼**：提供完整的開獎歷史表格、排序切換與 CSV 匯出功能。

**走勢分析**：顯示號碼頻率分析、走勢圖表與熱門號碼排行。

**統計分析**：展示大小/單雙比例、號碼分布等統計數據。

### AI 一星預測使用流程

**1. 選擇日期**

在 AI 一星頁面頂部選擇要分析的日期。系統將自動加載該日期的開獎數據。

**2. 配置 API 金鑰**

點擊「API Key 設定」按鈕，輸入您的 OpenAI 或 Gemini API 金鑰。系統將使用該金鑰進行 LLM 分析。若不配置，系統將使用統計演算法作為備用方案。

**3. 一鍵全部分析**

點擊「一鍵全部分析」按鈕，系統將自動分析所有 15 個時段，每個時段需要 3~5 秒進行 LLM 推理。分析完成後，各時段卡片將顯示預測的黃金球號碼。

**4. 查看驗證結果**

選擇某個時段的驗證 Tab（例如「11時 → 12時」），系統將顯示該時段對應的開獎驗證詳情，包括命中期數、命中率與特效提示。

**5. 同步歷史數據**

若要分析過去的日期，點擊「從 Google 同步」按鈕，系統將從 Google 試算表同步該日期的完整開獎記錄。

### Google Sheets 數據同步

系統支援從 Google 試算表自動同步開獎數據。Google 試算表應包含以下列：

| 列名 | 說明 | 格式 |
|------|------|------|
| 期別 | 開獎期號 | 9 位數字（例：115014627） |
| 日期 | 開獎日期 | YYYY-MM-DD（例：2026-03-21） |
| 時間 | 開獎時間 | HH:MM（例：07:05） |
| 開獎號碼 | 20 顆號碼 | 空格分隔（例：04 13 15 18...） |
| 超級獎號 | 超級獎號碼 | 格式：超級獎XX（例：超級獎49） |
| 大小 | 大小盤 | 大/小/－ |
| 單雙 | 單雙盤 | 單/雙/－ |

系統通過 Google Apps Script 提供的 API 讀取試算表，支援按日期查詢（`?action=date&date=2026-03-21`）。

## 🔧 API 參考

所有後端功能都通過 tRPC 路由暴露。以下是主要的公開 API：

### 開獎數據查詢

**`draw.latest`** - 取得最新開獎記錄

```typescript
const { data } = trpc.draw.latest.useQuery();
// 返回：{ drawNumber, drawTime, numbers[], superNumber, bigSmall, oddEven }
```

**`draw.history`** - 查詢開獎歷史（分頁）

```typescript
const { data } = trpc.draw.history.useQuery({ page: 1, limit: 50 });
// 返回：{ records: DrawRecord[], total: number }
```

### AI 一星預測

**`aiStar.batchAnalyze`** - 批量分析所有時段（需登入）

```typescript
const mutation = trpc.aiStar.batchAnalyze.useMutation();
await mutation.mutateAsync({ date: "2026-03-21", userApiKey: "sk-..." });
```

**`aiStar.getAnalysisRecords`** - 查詢 7 天分析記錄（需登入）

```typescript
const { data } = trpc.aiStar.getAnalysisRecords.useQuery({ days: 7 });
```

**`aiStar.getDailyVerifyDetails`** - 查詢指定日期的驗證詳情（公開）

```typescript
const { data } = trpc.aiStar.getDailyVerifyDetails.useQuery({ date: "2026-03-21" });
// 返回：{ slots: { hour, goldenBall, draws: { time, numbers, hit } }[] }
```

### Google Sheets 同步

**`googleSheets.syncByDate`** - 同步指定日期的數據（需登入）

```typescript
const mutation = trpc.googleSheets.syncByDate.useMutation();
await mutation.mutateAsync({ date: "2026-03-21" });
```

## 🧪 測試

該項目包含完整的 Vitest 單元測試套件。運行測試：

```bash
pnpm run test
```

測試覆蓋範圍包括：

- AI 預測演算法（ai-star-strategy.test.ts）
- Google Sheets 數據解析（google-sheets-sync.test.ts）
- 開獎數據驗證（draw.test.ts）
- UI 配置系統（ui-config.test.ts）
- API Key 驗證（api-key-validator.test.ts）

## 📁 項目結構

```
taiwan-bingo-app-init/
├── client/                      # 前端應用
│   ├── src/
│   │   ├── pages/              # 頁面組件
│   │   ├── components/         # 可重用組件
│   │   ├── lib/                # 工具函數
│   │   ├── App.tsx             # 主應用組件
│   │   └── main.tsx            # 入口點
│   ├── public/                 # 靜態資源
│   └── index.html              # HTML 模板
├── server/                      # 後端應用
│   ├── routers.ts              # tRPC 路由定義
│   ├── db.ts                   # 資料庫查詢助手
│   ├── services/               # 業務邏輯模塊
│   │   ├── ai-star-strategy.ts # AI 預測邏輯
│   │   └── google-sheets-sync.ts # Google 同步
│   └── _core/                  # 框架級別功能
├── drizzle/                     # 資料庫 Schema
│   ├── schema.ts               # 表定義
│   └── migrations/             # 遷移文件
├── package.json                # 依賴配置
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.ts          # Tailwind CSS 配置
├── vite.config.ts              # Vite 構建配置
└── README.md                   # 本文件
```

## 🎨 設計系統

該應用程式採用深色主題配色方案，旨在減少眼睛疲勞並提升視覺焦點：

| 元素 | 顏色 | 用途 |
|------|------|------|
| 背景 | `#000000`（純黑） | 主背景色 |
| 號碼球 | `#FFD700`（金色） | 開獎號碼、黃金球 |
| 超級獎 | `#FF0000`（鮮紅） | 超級獎號碼 |
| 文字 | `#FFFFFF`（白色） | 主文字色 |
| 邊框 | `#FFD700`（金色） | 卡片邊框、分隔線 |
| 背景卡片 | `#1A1A1A`（深灰） | 信息卡片背景 |

所有顏色均遵循 WCAG AA 無障礙標準，確保高對比度與易讀性。

## 🐛 已知問題與限制

- **15 時段分析缺失**：在某些情況下，一鍵全部分析可能跳過 15 時段。建議手動重新分析該時段。
- **LLM 響應延遲**：AI 分析每個時段需要 3~5 秒，取決於 LLM 服務的響應時間。
- **Google Sheets API 限制**：Google Apps Script 有每天 10 萬次調用的限制，大量同步操作可能觸發限制。

## 📝 貢獻指南

若要為該項目做出貢獻，請遵循以下步驟：

1. Fork 該項目
2. 建立功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 開啟 Pull Request

所有新功能應包含相應的 Vitest 單元測試，測試覆蓋率應不低於 80%。

## 📄 許可證

該項目採用 MIT 許可證。詳見 [LICENSE](LICENSE) 文件。

## 🤝 支援

若遇到問題或有功能建議，請通過以下方式聯繫：

- **Manus 幫助中心**：[https://help.manus.im](https://help.manus.im)
- **項目 Issue**：在 GitHub 上提交 Issue
- **郵件支援**：support@manus.im

## 🙏 致謝

該項目感謝以下資源與社區的支援：

- **台灣彩券**：提供開獎數據與 API
- **Manus 平台**：提供部署與 LLM 服務
- **開源社區**：React、Express、Drizzle 等優秀開源項目

---

**最後更新**：2026 年 3 月 22 日  
**版本**：1.0.0  
**維護者**：Manus AI
