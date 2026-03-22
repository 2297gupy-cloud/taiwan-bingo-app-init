# 台灣賓果 2026 - 部署指南

> 本文檔提供詳細的部署指南，涵蓋本地開發、測試環境、生產環境的完整部署流程。

## 📋 快速概覽

| 環境 | 用途 | 部署方式 | 數據庫 |
|------|------|---------|--------|
| 本地開發 | 開發與測試 | `pnpm run dev` | SQLite（可選）或 MySQL |
| 測試環境 | 功能驗證 | Docker Compose | MySQL |
| 生產環境 | 實際運營 | Manus / Docker / 其他 | MySQL / TiDB |

## 🚀 快速開始

### 1. 本地開發環境

**系統需求**：Node.js 18+、pnpm 8+、Git 2.30+

**步驟 1：克隆項目**

```bash
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app-init.git
cd taiwan-bingo-app-init
```

**步驟 2：安裝依賴**

```bash
pnpm install
```

**步驟 3：配置環境變數**

複製 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入必要的環境變數：

```env
# 資料庫配置
DATABASE_URL="mysql://root:password@localhost:3306/taiwan_bingo"

# Manus OAuth 配置
VITE_APP_ID="your-manus-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# JWT 密鑰
JWT_SECRET="your-secret-key-for-development"

# 其他配置
OWNER_OPEN_ID="your-owner-id"
OWNER_NAME="Your Name"
```

**步驟 4：初始化資料庫**

```bash
pnpm run db:push
```

**步驟 5：啟動開發伺服器**

```bash
pnpm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

## 🗄️ 資料庫配置詳解

### DATABASE_URL 格式

`DATABASE_URL` 是連接資料庫的關鍵配置。格式如下：

```
mysql://[user]:[password]@[host]:[port]/[database]
```

### 配置示例

**本地 MySQL**

```env
DATABASE_URL="mysql://root:password@localhost:3306/taiwan_bingo"
```

**遠程 MySQL**

```env
DATABASE_URL="mysql://user:password@db.example.com:3306/taiwan_bingo"
```

**MySQL with SSL（推薦用於生產環境）**

```env
DATABASE_URL="mysql://user:password@db.example.com:3306/taiwan_bingo?ssl=true&sslMode=require"
```

**TiDB Cloud**

```env
DATABASE_URL="mysql://root:password@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/taiwan_bingo?ssl=true&sslMode=require"
```

### 環境變數參考

| 變數名 | 說明 | 必需 | 示例 |
|--------|------|------|------|
| `DATABASE_URL` | 資料庫連接字符串 | ✅ | `mysql://root:pass@localhost:3306/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | ✅ | `your-secret-key` |
| `VITE_APP_ID` | Manus OAuth 應用 ID | ✅ | `app-id-123` |
| `OAUTH_SERVER_URL` | OAuth 伺服器 URL | ✅ | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 登入入口 URL | ✅ | `https://portal.manus.im` |
| `OWNER_OPEN_ID` | 項目所有者 ID | ✅ | `owner-id-123` |
| `OWNER_NAME` | 項目所有者名稱 | ✅ | `John Doe` |
| `BUILT_IN_FORGE_API_URL` | Manus API 基礎 URL | ✅ | `https://api.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | Manus API 密鑰 | ✅ | `api-key-123` |
| `VITE_FRONTEND_FORGE_API_URL` | 前端 Manus API URL | ✅ | `https://api.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端 Manus API 密鑰 | ✅ | `frontend-key-123` |

## 🐳 Docker 部署

### 使用 Docker Compose（推薦用於測試環境）

**步驟 1：建立 docker-compose.yml**

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: taiwan_bingo
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "mysql://root:rootpassword@mysql:3306/taiwan_bingo"
      JWT_SECRET: "your-secret-key"
      VITE_APP_ID: "your-app-id"
      # 其他環境變數...
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  mysql_data:
```

**步驟 2：建立 Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製應用程式代碼
COPY . .

# 初始化資料庫
RUN pnpm run db:push

# 構建應用程式
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 啟動應用程式
CMD ["pnpm", "run", "start"]
```

**步驟 3：啟動容器**

```bash
docker-compose up -d
```

應用程式將在 `http://localhost:3000` 可用。

### 使用 Docker 單容器部署

**構建鏡像**

```bash
docker build -t taiwan-bingo-app .
```

**運行容器**

```bash
docker run -d \
  --name taiwan-bingo \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://root:password@host.docker.internal:3306/taiwan_bingo" \
  -e JWT_SECRET="your-secret-key" \
  taiwan-bingo-app
```

## ☁️ Manus 平台部署

Manus 平台提供一鍵部署功能。應用程式已預配置 Manus 環境變數。

**部署步驟**

1. 在 Manus 管理界面中點擊「Publish」按鈕
2. 確認部署配置（域名、環境變數等）
3. 點擊「Deploy」開始部署
4. 等待部署完成（通常 2-5 分鐘）

**訪問應用程式**

部署完成後，應用程式將在以下 URL 可用：

```
https://tw-bingo-app-ktdjcs62.manus.space
```

## 🔧 其他部署方式

### Vercel 部署

**步驟 1：連接 GitHub**

1. 訪問 [Vercel](https://vercel.com)
2. 點擊「Import Project」
3. 選擇 GitHub Repository

**步驟 2：配置環境變數**

在 Vercel 項目設置中新增環境變數：

```
DATABASE_URL=mysql://...
JWT_SECRET=...
VITE_APP_ID=...
# 其他變數...
```

**步驟 3：部署**

Vercel 將自動從 GitHub 部署。每次推送到 `main` 分支時自動重新部署。

### Railway 部署

**步驟 1：連接 GitHub**

1. 訪問 [Railway](https://railway.app)
2. 點擊「New Project」
3. 選擇「Deploy from GitHub repo」

**步驟 2：配置資料庫**

1. 在 Railway 中新增 MySQL 服務
2. 複製連接字符串到 `DATABASE_URL`

**步驟 3：配置環境變數**

在 Railway 項目中設置所有必要的環境變數。

**步驟 4：部署**

Railway 將自動部署。

## 📊 資料庫遷移

### 首次部署

首次部署時，需要初始化資料庫架構：

```bash
pnpm run db:push
```

此命令將執行所有待處理的遷移。

### 更新部署

如果應用程式更新包含資料庫架構變更，執行：

```bash
pnpm run db:push
```

### 生成遷移

修改 `drizzle/schema.ts` 後，生成遷移文件：

```bash
pnpm drizzle-kit generate
```

此命令將在 `drizzle/migrations/` 中生成 SQL 遷移文件。

## 🔒 安全最佳實踐

### 環境變數安全

**不要在版本控制中提交 `.env` 文件**

```bash
# .gitignore 中應包含
.env
.env.local
.env.*.local
```

**使用密鑰管理服務**

對於生產環境，使用密鑰管理服務（如 AWS Secrets Manager、HashiCorp Vault）存儲敏感信息。

### 資料庫安全

**使用強密碼**

```env
DATABASE_URL="mysql://user:StrongPassword123!@host:3306/db"
```

**啟用 SSL 連接**

```env
DATABASE_URL="mysql://user:password@host:3306/db?ssl=true&sslMode=require"
```

**限制數據庫訪問**

配置防火牆規則，只允許應用程式伺服器訪問資料庫。

### API 安全

**使用強 JWT 密鑰**

```bash
# 生成安全的 JWT 密鑰
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**定期輪換密鑰**

每 90 天輪換一次 JWT 密鑰。

## 📈 性能優化

### 資料庫優化

**建立索引**

```sql
CREATE INDEX idx_draw_time ON draw_records(drawTime);
CREATE INDEX idx_user_id ON ai_star_predictions(userId);
```

**啟用查詢緩存**

在 MySQL 配置中啟用查詢緩存：

```ini
query_cache_size = 256M
query_cache_type = 1
```

### 應用程式優化

**啟用 gzip 壓縮**

在 Express 中使用 compression 中間件：

```typescript
import compression from 'compression';
app.use(compression());
```

**配置 CDN**

使用 CDN（如 Cloudflare）加速靜態資源。

## 🔍 監控與日誌

### 應用程式日誌

應用程式日誌位於 `.manus-logs/` 目錄：

- `devserver.log` - 伺服器啟動與 HMR 日誌
- `browserConsole.log` - 客戶端控制台日誌
- `networkRequests.log` - HTTP 請求日誌
- `sessionReplay.log` - 用戶交互日誌

**查看日誌**

```bash
# 查看最新 100 行伺服器日誌
tail -100 .manus-logs/devserver.log

# 搜索特定錯誤
grep "ERROR" .manus-logs/devserver.log
```

### 健康檢查

應用程式提供健康檢查端點：

```bash
curl http://localhost:3000/health
```

### 監控指標

使用 Prometheus 或其他監控工具收集指標：

```bash
# 啟用 Prometheus 指標
curl http://localhost:3000/metrics
```

## 🆘 故障排除

### 常見問題

**問題：資料庫連接失敗**

檢查 `DATABASE_URL` 是否正確：

```bash
# 測試連接
mysql -u root -p -h localhost -D taiwan_bingo
```

**問題：OAuth 登入失敗**

確認 `VITE_APP_ID` 和 `OAUTH_SERVER_URL` 正確。

**問題：應用程式啟動緩慢**

檢查資料庫連接池配置和查詢性能。

### 日誌分析

查看錯誤日誌以診斷問題：

```bash
# 查看最近的錯誤
grep "ERROR\|WARN" .manus-logs/*.log | tail -20
```

## 📞 獲取幫助

遇到部署問題？

1. **查看文檔**：閱讀 [README.md](README.md) 和 [DEVELOPER.md](DEVELOPER.md)
2. **檢查日誌**：查看 `.manus-logs/` 中的日誌文件
3. **提交 Issue**：在 GitHub 上提交 Issue
4. **聯繫支援**：訪問 [https://help.manus.im](https://help.manus.im)

## 📄 許可證

該項目採用 MIT 許可證。

---

**最後更新**：2026 年 3 月 22 日  
**版本**：1.0.0  
**維護者**：Manus AI
