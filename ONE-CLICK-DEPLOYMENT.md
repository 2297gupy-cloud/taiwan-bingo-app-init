# 台灣賓果應用 - 完整一鍵啟動部署指南

## 🎯 核心概念

本指南提供多種一鍵啟動方式，讓您無需任何開發工作即可快速啟動完整應用：

1. **本地開發**：使用 `setup-complete.mjs` 腳本
2. **Docker 容器化**：使用 `docker-compose` 快速部署
3. **Manus 平台**：直接在 Manus 上一鍵部署
4. **雲端部署**：部署到 Vercel、Netlify、Railway 等平台

---

## 📋 方式 1：本地開發啟動（最簡單）

### 前置需求

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 8.0+

### 一鍵啟動

```bash
# 1. 克隆專案
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app.git
cd taiwan-bingo-app

# 2. 複製環境變數
cp .env.example .env

# 3. 編輯 .env 填入必需的配置（見下方）

# 4. 執行一鍵啟動腳本
node setup-complete.mjs

# 5. 完成！在瀏覽器打開 http://localhost:3000
```

### 環境變數配置

編輯 `.env` 檔案：

```env
# 資料庫
DATABASE_URL=mysql://bingo:bingo123@localhost:3306/taiwan_bingo

# 認證
JWT_SECRET=your-secret-key-here

# Manus OAuth（從 Manus 控制台獲取）
VITE_APP_ID=app_xxxxx
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Manus 內建 API（從 Manus 控制台獲取）
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=key_xxxxx
VITE_FRONTEND_FORGE_API_KEY=key_xxxxx
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
```

---

## 🐳 方式 2：Docker 容器化啟動（推薦用於生產）

### 前置需求

- Docker 20.10+
- Docker Compose 2.0+

### 一鍵啟動

```bash
# 1. 克隆專案
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app.git
cd taiwan-bingo-app

# 2. 複製環境變數
cp .env.example .env

# 3. 編輯 .env 填入必需的配置

# 4. 一鍵啟動完整應用棧（MySQL + 應用 + Redis）
docker-compose up -d

# 5. 查看日誌
docker-compose logs -f app

# 6. 完成！在瀏覽器打開 http://localhost:3000
```

### Docker 常用命令

```bash
# 停止應用
docker-compose down

# 重啟應用
docker-compose restart

# 查看容器狀態
docker-compose ps

# 進入應用容器
docker-compose exec app sh

# 查看應用日誌
docker-compose logs app

# 清理所有資料（包括資料庫）
docker-compose down -v
```

### Docker 進階配置

#### 自訂埠

編輯 `docker-compose.yml`：

```yaml
services:
  app:
    ports:
      - "8080:3000"  # 改為 8080
```

#### 啟用 Redis 快取

```bash
# 使用 cache profile 啟動 Redis
docker-compose --profile cache up -d
```

#### 使用外部資料庫

編輯 `.env`：

```env
DATABASE_URL=mysql://user:password@external-host:3306/database_name
```

---

## 🚀 方式 3：Manus 平台一鍵部署

### 步驟 1：在 Manus 建立新專案

1. 登入 Manus 控制台
2. 點擊「建立新專案」
3. 選擇「Web App」模板
4. 選擇「React + Express + MySQL」

### 步驟 2：連接 GitHub 或上傳代碼

**選項 A：連接 GitHub**
1. 授權 Manus 訪問您的 GitHub
2. 選擇 `2297gupy-cloud/taiwan-bingo-app` 倉庫
3. 選擇 `main` 分支

**選項 B：上傳 ZIP 檔案**
1. 下載 `taiwan-bingo-app-v5-color-fixed.zip`
2. 在 Manus 中上傳 ZIP 檔案

### 步驟 3：配置環境變數

在 Manus 控制台的「設定」→「環境變數」中添加：

```
VITE_APP_ID=app_xxxxx
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=key_xxxxx
VITE_FRONTEND_FORGE_API_KEY=key_xxxxx
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
```

### 步驟 4：執行初始化

在 Manus 控制台中執行以下命令：

```bash
# 執行一鍵啟動腳本
node setup-complete.mjs --skip-tests
```

### 步驟 5：發布應用

1. 點擊「發布」按鈕
2. 等待部署完成
3. 點擊「查看應用」在新標籤頁打開

---

## ☁️ 方式 4：雲端平台部署

### Vercel 部署

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入 Vercel
vercel login

# 3. 部署
vercel

# 4. 配置環境變數
# 在 Vercel 控制台中添加所有 .env 變數

# 5. 重新部署
vercel --prod
```

### Netlify 部署

```bash
# 1. 安裝 Netlify CLI
npm i -g netlify-cli

# 2. 登入 Netlify
netlify login

# 3. 部署
netlify deploy --prod

# 4. 配置環境變數
# 在 Netlify 控制台中添加所有 .env 變數
```

### Railway 部署

```bash
# 1. 安裝 Railway CLI
npm i -g @railway/cli

# 2. 登入 Railway
railway login

# 3. 建立新專案
railway init

# 4. 添加 MySQL 服務
railway add

# 5. 配置環境變數
railway variables

# 6. 部署
railway up
```

---

## 📊 一鍵啟動流程對比

| 方式 | 難度 | 時間 | 適用場景 | 成本 |
|------|------|------|---------|------|
| 本地開發 | ⭐ 簡單 | 5 分鐘 | 開發測試 | 免費 |
| Docker | ⭐⭐ 中等 | 10 分鐘 | 本地生產 | 免費 |
| Manus | ⭐⭐⭐ 複雜 | 15 分鐘 | 完整託管 | 按使用量計費 |
| Vercel | ⭐⭐⭐ 複雜 | 10 分鐘 | 靜態 + API | 免費/付費 |
| Railway | ⭐⭐⭐ 複雜 | 15 分鐘 | 全棧應用 | 按使用量計費 |

---

## 🔧 進階配置

### 自訂應用名稱和標誌

編輯 `.env`：

```env
VITE_APP_TITLE=我的台灣賓果
VITE_APP_LOGO=https://example.com/logo.png
```

### 啟用 SSL/TLS

對於生產環境，使用 HTTPS：

```bash
# 使用 Let's Encrypt 獲取免費證書
certbot certonly --standalone -d yourdomain.com

# 配置 Nginx 或 Apache 使用證書
```

### 配置自訂域名

1. 在您的域名提供商中配置 DNS：
   ```
   CNAME: yourdomain.com -> your-app.manus.space
   ```

2. 在 Manus 控制台中添加自訂域名

3. 等待 SSL 證書自動配置（通常 5-10 分鐘）

### 啟用分析和監控

```env
VITE_ANALYTICS_WEBSITE_ID=your_analytics_id
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
```

---

## 🐛 常見問題

### Q：如何更改應用埠？

**A：** 編輯 `.env` 或使用環境變數：

```bash
PORT=8080 pnpm dev
```

### Q：如何重置資料庫？

**A：** 執行以下命令：

```bash
# 本地開發
node seed-data.mjs

# Docker
docker-compose exec app node seed-data.mjs
```

### Q：如何查看應用日誌？

**A：** 日誌位置：

```bash
# 本地開發
cat .manus-logs/devserver.log

# Docker
docker-compose logs app
```

### Q：如何備份資料庫？

**A：** 執行以下命令：

```bash
# 本地開發
mysqldump -u bingo -p taiwan_bingo > backup.sql

# Docker
docker-compose exec mysql mysqldump -u bingo -p taiwan_bingo > backup.sql
```

---

## 📈 性能優化

### 啟用快取

```bash
# 使用 Redis 快取
docker-compose --profile cache up -d
```

### 優化資料庫查詢

所有查詢已使用索引優化，無需額外配置。

### CDN 配置

將靜態資源上傳到 CDN：

```env
VITE_CDN_URL=https://cdn.example.com
```

---

## 🔐 安全檢查清單

- [ ] 更改所有預設密碼
- [ ] 配置 HTTPS/SSL
- [ ] 啟用防火牆
- [ ] 定期備份資料庫
- [ ] 監控應用日誌
- [ ] 定期更新依賴
- [ ] 配置 CORS 白名單
- [ ] 啟用速率限制

---

## 📞 支援和幫助

- **文檔**：參考 `QUICK-START.md` 和 `MANUS-MIGRATION-GUIDE.md`
- **GitHub Issues**：提交問題報告
- **Manus 支援**：訪問 https://help.manus.im

---

**版本**：6.0.0  
**最後更新**：2026-03-14  
**狀態**：✅ 生產就緒
