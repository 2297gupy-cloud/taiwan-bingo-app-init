# 台灣賓果應用 - 一鍵啟動快速指南

## 🚀 最快啟動方式（3 步驟）

### 步驟 1：克隆或下載專案

```bash
# 方式 A：從 GitHub 克隆
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app.git
cd taiwan-bingo-app

# 方式 B：下載 ZIP 檔案
# 下載 taiwan-bingo-app-v5-color-fixed.zip 並解壓
cd taiwan-bingo-app
```

### 步驟 2：執行一鍵啟動腳本

```bash
# 完整一鍵啟動（包括依賴安裝、資料庫初始化、測試、啟動伺服器）
node setup-complete.mjs

# 或只進行資料庫初始化
node setup-complete.mjs --db-only

# 或跳過測試
node setup-complete.mjs --skip-tests

# 或只啟動開發伺服器
node setup-complete.mjs --dev-only
```

### 步驟 3：在瀏覽器中打開

```
http://localhost:3000
```

---

## 📋 詳細步驟

### 前置需求

- **Node.js** 22.13.0 或更高版本
- **pnpm** 10.4.1 或更高版本
- **MySQL** 8.0 或更高版本
- **Manus 帳戶**（用於 OAuth 和 API）

### 環境配置

1. **複製環境變數範本**
   ```bash
   cp .env.example .env
   ```

2. **編輯 .env 檔案並填入以下必需變數**
   ```env
   # 資料庫
   DATABASE_URL=mysql://user:password@localhost:3306/taiwan_bingo

   # 認證
   JWT_SECRET=your-secret-key-here

   # Manus OAuth
   VITE_APP_ID=app_xxxxx
   OAUTH_SERVER_URL=https://api.manus.im
   VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

   # Manus 內建 API
   BUILT_IN_FORGE_API_URL=https://forge.manus.im
   BUILT_IN_FORGE_API_KEY=key_xxxxx
   VITE_FRONTEND_FORGE_API_KEY=key_xxxxx
   VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
   ```

### 完整啟動流程

```bash
# 1. 安裝依賴
pnpm install

# 2. 生成資料庫遷移
pnpm drizzle-kit generate

# 3. 執行資料庫遷移 SQL（使用 Manus webdev_execute_sql）
# 執行以下檔案中的 SQL：
# - drizzle/migrations/0001_initial_schema.sql
# - drizzle/migrations/0002_ui_config_tables.sql

# 4. 初始化種子資料
node seed-data.mjs

# 5. 初始化 UI 配置
node init-ui-config.mjs

# 6. 執行測試
pnpm test

# 7. 啟動開發伺服器
pnpm dev
```

---

## 🎯 一鍵啟動腳本選項

### 基本使用

```bash
# 完整啟動（推薦）
node setup-complete.mjs
```

### 進階選項

```bash
# 只初始化資料庫（跳過依賴安裝和伺服器啟動）
node setup-complete.mjs --db-only

# 跳過測試（加快啟動速度）
node setup-complete.mjs --skip-tests

# 只啟動開發伺服器（假設已完成初始化）
node setup-complete.mjs --dev-only
```

---

## 📊 啟動流程圖

```
┌─────────────────────────────────────┐
│  檢查系統環境和依賴                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  安裝 npm 依賴                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  檢查環境變數                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  生成資料庫遷移 SQL                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  執行資料庫遷移                      │
│  (需要 Manus webdev_execute_sql)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  初始化種子資料                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  初始化 UI 配置                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  執行所有測試                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  啟動開發伺服器                      │
│  http://localhost:3000              │
└─────────────────────────────────────┘
```

---

## 🔍 故障排除

### 資料庫連接失敗

**症狀**：`Error: connect ECONNREFUSED 127.0.0.1:3306`

**解決方案**：
1. 檢查 MySQL 伺服器是否正在運行
2. 驗證 `DATABASE_URL` 中的主機名、埠、使用者名稱和密碼
3. 確保資料庫已建立

### 依賴安裝失敗

**症狀**：`npm ERR! code ERESOLVE`

**解決方案**：
```bash
# 清除快取並重新安裝
rm -rf node_modules pnpm-lock.yaml
pnpm install --force
```

### 測試失敗

**症狀**：`Tests failed: X failed, Y passed`

**解決方案**：
1. 確保資料庫已初始化
2. 執行 `node seed-data.mjs` 重新初始化種子資料
3. 檢查 `.manus-logs/` 目錄中的日誌檔案

### 伺服器無法啟動

**症狀**：`Error: listen EADDRINUSE :::3000`

**解決方案**：
```bash
# 方式 1：使用不同的埠
PORT=3001 pnpm dev

# 方式 2：殺死佔用埠的進程
lsof -i :3000
kill -9 <PID>
```

---

## 📚 更多資訊

- **完整遷移指南**：參考 `MANUS-MIGRATION-GUIDE.md`
- **遷移檢查清單**：參考 `MANUS-MIGRATION-CHECKLIST.md`
- **UI 配置指南**：參考 `UI-CONFIG-GUIDE.md`
- **API 文檔**：參考 `server/routers.ts` 中的註釋

---

## 🎁 包含內容

✅ 完整的前端 UI（React 19 + TypeScript + Tailwind CSS）  
✅ 完整的後端 API（Express + tRPC + Drizzle ORM）  
✅ 完整的資料庫 Schema（MySQL）  
✅ 200+ 筆模擬開獎資料  
✅ 完整的 UI 配置系統  
✅ 21 個通過的 Vitest 測試  
✅ 完整的文檔和指南  
✅ 一鍵啟動腳本  

---

## 🚀 部署

### 部署到 Manus

1. 在 Manus 管理介面中建立新專案
2. 連接 GitHub 倉庫或上傳 ZIP 檔案
3. 配置環境變數
4. 執行 `node setup-complete.mjs` 進行初始化
5. 點擊「發布」按鈕進行部署

### 部署到其他平台

參考 `MANUS-MIGRATION-GUIDE.md` 中的部署章節

---

## 💡 提示

- 首次啟動可能需要 5-10 分鐘，請耐心等待
- 如果遇到任何問題，查看 `.manus-logs/` 目錄中的日誌檔案
- 所有環境變數都可以在 `.env` 檔案中修改
- 種子資料可以在 `seed-data.mjs` 中自訂

---

**版本**：6.0.0  
**最後更新**：2026-03-14  
**狀態**：✅ 生產就緒
