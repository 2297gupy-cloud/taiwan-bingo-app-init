# Manus 專案遷移和快速啟動指南

## 概述

本指南說明如何將台灣賓果應用完整遷移到其他 Manus 專案中，實現「一鍵啟動」完整應用，無需重新開發任何 UI 或功能。

## 遷移方式

### 方式 1：直接克隆現有 Manus 專案（推薦）

最快速的方式是直接克隆已配置好的 Manus 專案。

#### 步驟 1：克隆專案
```bash
# 從 GitHub 克隆
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app.git my-bingo-app
cd my-bingo-app

# 或使用 Manus webdev 連結
# manus-webdev://c2f11778
```

#### 步驟 2：快速啟動
```bash
# 執行快速啟動腳本（自動化所有初始化步驟）
node manus-quick-start.mjs
```

腳本會自動執行：
- ✓ 檢查 Node.js 和 pnpm 版本
- ✓ 安裝所有依賴
- ✓ 生成資料庫遷移 SQL
- ✓ 初始化種子資料
- ✓ 初始化 UI 配置
- ✓ 執行所有測試

#### 步驟 3：配置環境變數
```bash
# 編輯 .env 檔案
cp .env.example .env

# 填入以下必需的環境變數：
DATABASE_URL=mysql://user:password@localhost:3306/taiwan_bingo
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
```

#### 步驟 4：執行資料庫遷移
```bash
# 使用 Manus webdev 的 webdev_execute_sql 工具執行遷移 SQL
# 或在本地 MySQL 客戶端執行：
mysql -u user -p < drizzle/migrations/0001_initial_schema.sql
mysql -u user -p < drizzle/migrations/0002_ui_config_tables.sql
```

#### 步驟 5：啟動應用
```bash
# 啟動開發伺服器
pnpm dev

# 在瀏覽器中打開
http://localhost:3000
```

---

### 方式 2：手動集成到現有 Manus 專案

如果您已有一個 Manus 專案，可以手動集成台灣賓果的所有功能。

#### 步驟 1：複製檔案結構

複製以下目錄和檔案到您的專案：

**前端檔案**：
```
client/src/pages/
  - MainPage.tsx
  - Checker.tsx
  - Trend.tsx
  - History.tsx
  - AiPredict.tsx
  - Stats.tsx
  - Live.tsx

client/src/components/
  - TabBar.tsx
  - NumberBall.tsx
  - SiteHeader.tsx
  - LiveDraw.tsx
  - AIPrediction.tsx
  - HistoryTable.tsx
  - DataAnalysis.tsx
  - ScrollToTopButton.tsx

client/src/lib/
  - utils.ts
  - trpc.ts
```

**後端檔案**：
```
server/
  - db.ts
  - routers.ts
  - ui-config-export.ts
  - ui-config-db.ts
  - manus-template-export.ts
  - draw.test.ts
  - ui-config.test.ts
```

**資料庫檔案**：
```
drizzle/
  - schema.ts
  - ui-config-schema.ts
  - migrations/
    - 0001_initial_schema.sql
    - 0002_ui_config_tables.sql
```

**配置和腳本**：
```
- seed-data.mjs
- init-ui-config.mjs
- manus-quick-start.mjs
- UI-CONFIG-GUIDE.md
- MANUS-MIGRATION-GUIDE.md
```

#### 步驟 2：更新 package.json

確保您的 `package.json` 包含所有必需的依賴：

```json
{
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0",
    "@trpc/server": "^11.6.0",
    "recharts": "^2.15.2",
    "drizzle-orm": "^0.44.5",
    "mysql2": "^3.15.0",
    "tailwindcss": "^4.1.14",
    "@radix-ui/react-*": "^1.x.x"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vite": "^7.1.7",
    "vitest": "^2.1.4",
    "drizzle-kit": "^0.31.4"
  }
}
```

#### 步驟 3：更新資料庫 Schema

將 `drizzle/schema.ts` 和 `drizzle/ui-config-schema.ts` 的內容合併到您的 schema 檔案中。

#### 步驟 4：更新路由

將 `server/routers.ts` 中的所有路由添加到您的應用路由中。

#### 步驟 5：更新前端應用

更新 `client/src/App.tsx` 以包含所有新頁面和路由。

#### 步驟 6：執行初始化腳本

```bash
pnpm install
pnpm drizzle-kit generate
node seed-data.mjs
node init-ui-config.mjs
pnpm test
pnpm dev
```

---

## 完整檔案清單

### 前端頁面和組件
| 檔案 | 描述 | 大小 |
|------|------|------|
| `client/src/pages/MainPage.tsx` | 主頁面（即時開獎、AI預測、歷史紀錄、數據分析） | ~15KB |
| `client/src/pages/Checker.tsx` | 對獎工具頁面 | ~8KB |
| `client/src/pages/Trend.tsx` | 走勢分析頁面 | ~10KB |
| `client/src/components/TabBar.tsx` | 底部導航欄 | ~5KB |
| `client/src/components/NumberBall.tsx` | 號碼球組件 | ~3KB |
| `client/src/components/LiveDraw.tsx` | 即時開獎組件 | ~12KB |
| `client/src/components/AIPrediction.tsx` | AI預測組件 | ~10KB |
| `client/src/components/HistoryTable.tsx` | 歷史表格組件 | ~8KB |
| `client/src/components/DataAnalysis.tsx` | 數據分析組件 | ~12KB |

### 後端邏輯
| 檔案 | 描述 | 大小 |
|------|------|------|
| `server/db.ts` | 資料庫查詢函數 | ~15KB |
| `server/routers.ts` | tRPC 路由定義 | ~20KB |
| `server/ui-config-export.ts` | UI 配置定義 | ~25KB |
| `server/ui-config-db.ts` | UI 配置資料庫操作 | ~12KB |
| `server/manus-template-export.ts` | Manus 專案範本定義 | ~30KB |

### 資料庫
| 檔案 | 描述 |
|------|------|
| `drizzle/schema.ts` | 核心資料庫 Schema |
| `drizzle/ui-config-schema.ts` | UI 配置資料庫 Schema |
| `drizzle/migrations/0001_initial_schema.sql` | 初始遷移 |
| `drizzle/migrations/0002_ui_config_tables.sql` | UI 配置表遷移 |

### 腳本和文檔
| 檔案 | 描述 |
|------|------|
| `seed-data.mjs` | 種子資料初始化腳本 |
| `init-ui-config.mjs` | UI 配置初始化腳本 |
| `manus-quick-start.mjs` | 快速啟動自動化腳本 |
| `UI-CONFIG-GUIDE.md` | UI 配置系統文檔 |
| `MANUS-MIGRATION-GUIDE.md` | 本遷移指南 |

---

## 環境變數配置

### 必需變數

| 變數 | 描述 | 範例 |
|------|------|------|
| `DATABASE_URL` | MySQL 資料庫連接字符串 | `mysql://user:pass@localhost:3306/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | `your-secret-key-here` |
| `VITE_APP_ID` | Manus OAuth 應用 ID | `app_xxxxx` |
| `OAUTH_SERVER_URL` | Manus OAuth 伺服器 URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth 登入門戶 URL | `https://oauth.manus.im` |
| `BUILT_IN_FORGE_API_URL` | Manus 內建 API URL | `https://forge.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | Manus 內建 API 金鑰 | `key_xxxxx` |

### 可選變數

| 變數 | 描述 | 預設值 |
|------|------|--------|
| `NODE_ENV` | 環境（development/production） | `development` |
| `PORT` | 伺服器埠 | `3000` |

---

## 資料庫遷移

### 自動遷移
```bash
pnpm drizzle-kit generate
```

### 手動遷移
```bash
# 執行遷移 SQL
mysql -u user -p database_name < drizzle/migrations/0001_initial_schema.sql
mysql -u user -p database_name < drizzle/migrations/0002_ui_config_tables.sql
```

### 使用 Manus webdev 執行遷移
在 Manus 管理介面中使用 `webdev_execute_sql` 工具執行遷移 SQL。

---

## 測試

### 執行所有測試
```bash
pnpm test
```

### 執行特定測試
```bash
pnpm test draw.test.ts
pnpm test ui-config.test.ts
```

### 測試覆蓋率
```bash
pnpm test -- --coverage
```

---

## 部署

### 構建應用
```bash
pnpm build
```

### 啟動生產伺服器
```bash
pnpm start
```

### 部署到 Manus
1. 在 Manus 管理介面中建立新專案
2. 連接 GitHub 倉庫
3. 配置環境變數
4. 執行部署

---

## 故障排除

### 資料庫連接失敗
- 檢查 `DATABASE_URL` 是否正確
- 確認 MySQL 伺服器正在運行
- 驗證使用者名稱和密碼

### 依賴安裝失敗
- 清除 `node_modules` 和 `pnpm-lock.yaml`
- 執行 `pnpm install --force`

### 測試失敗
- 檢查資料庫是否已初始化
- 執行 `node seed-data.mjs` 初始化種子資料
- 查看測試日誌獲取詳細錯誤信息

### UI 配置未載入
- 執行 `node init-ui-config.mjs` 初始化配置
- 檢查 `uiConfig.getTaiwanBingoV2` API 是否可用

---

## 支援和文檔

- **GitHub 倉庫**：https://github.com/2297gupy-cloud/taiwan-bingo-app
- **UI 配置指南**：參考 `UI-CONFIG-GUIDE.md`
- **API 文檔**：參考 `server/routers.ts` 中的註釋
- **開發指南**：參考 `README.md`

---

## 許可證

MIT License

---

## 常見問題

### Q: 我可以自訂應用的顏色和主題嗎？
**A**: 是的，編輯 `client/src/index.css` 中的 CSS 變數或修改 `server/ui-config-export.ts` 中的主題配置。

### Q: 如何添加新的開獎資料來源？
**A**: 編輯 `server/db.ts` 中的 `getLatestDraw()` 函數以連接您的資料來源。

### Q: 我可以禁用某些功能模組嗎？
**A**: 是的，在 `server/ui-config-export.ts` 中設定模組的 `enabled` 為 `false`。

### Q: 如何備份和恢復資料？
**A**: 使用標準 MySQL 備份工具：
```bash
mysqldump -u user -p database_name > backup.sql
mysql -u user -p database_name < backup.sql
```

---

**最後更新**：2026-03-14  
**版本**：3.0.0
