# Manus 專案遷移檢查清單

使用此清單確保完整遷移台灣賓果應用到您的 Manus 專案。

## 📋 前置準備

- [ ] 已安裝 Node.js 22.13.0 或更高版本
- [ ] 已安裝 pnpm 10.4.1 或更高版本
- [ ] 已安裝 MySQL 8.0 或更高版本
- [ ] 已建立 Manus 帳戶和 OAuth 應用
- [ ] 已準備好 Manus 內建 API 金鑰

## 🔄 方式 1：直接克隆（推薦）

### 克隆和初始化
- [ ] 從 GitHub 克隆專案：`git clone https://github.com/2297gupy-cloud/taiwan-bingo-app.git`
- [ ] 進入專案目錄：`cd taiwan-bingo-app`
- [ ] 執行快速啟動腳本：`node manus-quick-start.mjs`

### 環境配置
- [ ] 複製 `.env.example` 為 `.env`
- [ ] 設定 `DATABASE_URL`
- [ ] 設定 `JWT_SECRET`
- [ ] 設定 `VITE_APP_ID`
- [ ] 設定 `OAUTH_SERVER_URL`
- [ ] 設定 `VITE_OAUTH_PORTAL_URL`
- [ ] 設定 `BUILT_IN_FORGE_API_URL`
- [ ] 設定 `BUILT_IN_FORGE_API_KEY`
- [ ] 設定 `VITE_FRONTEND_FORGE_API_KEY`
- [ ] 設定 `VITE_FRONTEND_FORGE_API_URL`

### 資料庫初始化
- [ ] 執行資料庫遷移：`pnpm drizzle-kit generate`
- [ ] 使用 `webdev_execute_sql` 執行遷移 SQL
- [ ] 初始化種子資料：`node seed-data.mjs`
- [ ] 初始化 UI 配置：`node init-ui-config.mjs`

### 測試和驗證
- [ ] 執行所有測試：`pnpm test`
- [ ] 所有測試通過（21/21）
- [ ] 啟動開發伺服器：`pnpm dev`
- [ ] 在瀏覽器中打開 http://localhost:3000
- [ ] 驗證首頁正常顯示
- [ ] 驗證即時開獎區域顯示
- [ ] 驗證 AI 預測區域顯示
- [ ] 驗證歷史紀錄表格顯示
- [ ] 驗證數據分析圖表顯示

---

## 🛠️ 方式 2：手動集成

### 複製檔案結構

#### 前端檔案
- [ ] 複製 `client/src/pages/` 目錄
  - [ ] MainPage.tsx
  - [ ] Checker.tsx
  - [ ] Trend.tsx
  - [ ] History.tsx
  - [ ] AiPredict.tsx
  - [ ] Stats.tsx
  - [ ] Live.tsx

- [ ] 複製 `client/src/components/` 目錄
  - [ ] TabBar.tsx
  - [ ] NumberBall.tsx
  - [ ] SiteHeader.tsx
  - [ ] LiveDraw.tsx
  - [ ] AIPrediction.tsx
  - [ ] HistoryTable.tsx
  - [ ] DataAnalysis.tsx
  - [ ] ScrollToTopButton.tsx

- [ ] 複製 `client/src/lib/` 檔案
  - [ ] utils.ts
  - [ ] trpc.ts

- [ ] 更新 `client/src/index.css`
- [ ] 更新 `client/src/App.tsx`

#### 後端檔案
- [ ] 複製 `server/db.ts`
- [ ] 複製 `server/routers.ts`
- [ ] 複製 `server/ui-config-export.ts`
- [ ] 複製 `server/ui-config-db.ts`
- [ ] 複製 `server/manus-template-export.ts`
- [ ] 複製 `server/draw.test.ts`
- [ ] 複製 `server/ui-config.test.ts`

#### 資料庫檔案
- [ ] 複製 `drizzle/schema.ts` 內容到您的 schema
- [ ] 複製 `drizzle/ui-config-schema.ts` 內容到您的 schema
- [ ] 複製 `drizzle/migrations/` 目錄

#### 配置和腳本
- [ ] 複製 `seed-data.mjs`
- [ ] 複製 `init-ui-config.mjs`
- [ ] 複製 `manus-quick-start.mjs`
- [ ] 複製 `UI-CONFIG-GUIDE.md`
- [ ] 複製 `MANUS-MIGRATION-GUIDE.md`

### 更新依賴
- [ ] 更新 `package.json` 中的依賴版本
- [ ] 執行 `pnpm install`
- [ ] 執行 `pnpm install --save recharts` (如果未安裝)

### 整合配置
- [ ] 合併資料庫 Schema
- [ ] 合併 tRPC 路由
- [ ] 合併前端頁面和路由
- [ ] 更新環境變數配置

### 初始化和測試
- [ ] 執行 `pnpm drizzle-kit generate`
- [ ] 執行資料庫遷移
- [ ] 執行 `node seed-data.mjs`
- [ ] 執行 `node init-ui-config.mjs`
- [ ] 執行 `pnpm test`
- [ ] 執行 `pnpm dev`
- [ ] 驗證應用功能

---

## 🔍 功能驗證

### 首頁功能
- [ ] 頂部快捷按鈕顯示（即時開獎、AI預測、歷史號碼）
- [ ] 公告區域顯示
- [ ] 即時開獎區域顯示當期號碼
- [ ] 倒數計時器正常工作
- [ ] AI 預測區域顯示預測資訊
- [ ] 歷史號碼表格顯示最近開獎
- [ ] 數據分析圖表顯示

### 對獎工具
- [ ] 頁面可正常訪問
- [ ] 號碼輸入框正常工作
- [ ] 對獎功能正常工作
- [ ] 結果正確顯示

### 走勢分析
- [ ] 頁面可正常訪問
- [ ] 圖表正常顯示
- [ ] 期數切換正常工作

### 底部導航
- [ ] 所有導航項目顯示
- [ ] 導航項目點擊有效
- [ ] 頁面跳轉正常

### API 功能
- [ ] `GET /api/trpc/draw.latest` 正常工作
- [ ] `GET /api/trpc/draw.recent` 正常工作
- [ ] `GET /api/trpc/draw.history` 正常工作
- [ ] `GET /api/trpc/prediction.latest` 正常工作
- [ ] `GET /api/trpc/uiConfig.getTaiwanBingoV2` 正常工作
- [ ] `GET /api/trpc/uiConfig.exportAsJSON` 正常工作
- [ ] `GET /api/trpc/uiConfig.getSummary` 正常工作

### 資料庫功能
- [ ] 所有表已建立
- [ ] 種子資料已插入
- [ ] UI 配置已初始化
- [ ] 查詢功能正常工作

---

## 📊 測試覆蓋

- [ ] 執行 `pnpm test`
- [ ] 所有 21 個測試通過
  - [ ] auth.logout.test.ts (1 個測試)
  - [ ] draw.test.ts (7 個測試)
  - [ ] ui-config.test.ts (13 個測試)

---

## 🚀 部署準備

### 構建驗證
- [ ] 執行 `pnpm build`
- [ ] 構建成功完成
- [ ] 無構建錯誤或警告

### 生產環境配置
- [ ] 設定 `NODE_ENV=production`
- [ ] 更新所有生產環境變數
- [ ] 驗證資料庫連接
- [ ] 驗證 OAuth 配置
- [ ] 驗證 API 金鑰

### 部署檢查
- [ ] 選擇部署平台（Manus / Vercel / Netlify / 其他）
- [ ] 配置部署環境變數
- [ ] 執行部署
- [ ] 驗證生產環境應用
- [ ] 檢查日誌無錯誤

---

## 📚 文檔和資源

- [ ] 已閱讀 `README.md`
- [ ] 已閱讀 `UI-CONFIG-GUIDE.md`
- [ ] 已閱讀 `MANUS-MIGRATION-GUIDE.md`
- [ ] 已閱讀 API 文檔
- [ ] 已備份重要資料

---

## ✅ 最終檢查

- [ ] 所有檔案已複製
- [ ] 所有依賴已安裝
- [ ] 所有環境變數已配置
- [ ] 資料庫已初始化
- [ ] 所有測試已通過
- [ ] 應用已在本地運行
- [ ] 所有功能已驗證
- [ ] 應用已準備部署

---

## 🎉 遷移完成

恭喜！您已成功遷移台灣賓果應用到您的 Manus 專案。

### 下一步
1. 根據需要自訂應用（顏色、文本、功能等）
2. 連接真實的開獎資料來源
3. 部署到生產環境
4. 監控應用性能和錯誤
5. 定期更新和維護

### 支援
- GitHub 倉庫：https://github.com/2297gupy-cloud/taiwan-bingo-app
- 文檔：參考專案中的 .md 檔案
- 問題報告：在 GitHub 上提交 Issue

---

**檢查清單版本**：1.0  
**最後更新**：2026-03-14
