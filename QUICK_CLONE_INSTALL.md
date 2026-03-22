# 台灣賓果 2026 - 快速克隆與一鍵安裝指南

> 本文檔提供最快速的克隆與安裝指令，讓新用戶能在 5 分鐘內部署應用程式。

## 🚀 一鍵安裝指令

### 完整自動化安裝（推薦）

將以下指令複製並在終端機中執行：

```bash
#!/bin/bash
set -e

# 1. 克隆項目
echo "📥 克隆項目..."
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app-init.git
cd taiwan-bingo-app-init

# 2. 安裝 pnpm（如果未安裝）
echo "📦 檢查 pnpm..."
if ! command -v pnpm &> /dev/null; then
  echo "安裝 pnpm..."
  npm install -g pnpm
fi

# 3. 安裝依賴
echo "📚 安裝依賴..."
pnpm install

# 4. 配置環境變數
echo "⚙️ 配置環境變數..."
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# 資料庫配置
DATABASE_URL="mysql://root:password@localhost:3306/taiwan_bingo"

# Manus OAuth 配置
VITE_APP_ID="your-manus-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# JWT 密鑰
JWT_SECRET="your-secret-key-here"

# 項目所有者信息
OWNER_OPEN_ID="your-owner-id"
OWNER_NAME="Your Name"

# Manus API 配置
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="your-api-key"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-key"
EOF
  echo "✅ .env.local 已建立，請編輯並填入實際值"
else
  echo "✅ .env.local 已存在"
fi

# 5. 初始化資料庫
echo "🗄️ 初始化資料庫..."
pnpm run db:push

# 6. 啟動開發伺服器
echo "🚀 啟動開發伺服器..."
pnpm run dev

echo "✨ 應用程式已啟動！訪問 http://localhost:3000"
```

### 分步驟安裝

如果您希望逐步執行安裝，請按以下步驟進行：

**步驟 1：克隆項目**

```bash
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app-init.git
cd taiwan-bingo-app-init
```

**步驟 2：安裝 pnpm（如果未安裝）**

```bash
npm install -g pnpm
```

**步驟 3：安裝依賴**

```bash
pnpm install
```

**步驟 4：配置環境變數**

複製 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入您的配置值。

**步驟 5：初始化資料庫**

```bash
pnpm run db:push
```

**步驟 6：啟動開發伺服器**

```bash
pnpm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

## 🐳 使用 Docker 快速安裝

如果您已安裝 Docker 和 Docker Compose，可以使用以下指令一鍵啟動：

```bash
# 克隆項目
git clone https://github.com/2297gupy-cloud/taiwan-bingo-app-init.git
cd taiwan-bingo-app-init

# 使用 Docker Compose 啟動
docker-compose up -d

# 初始化資料庫
docker-compose exec app pnpm run db:push

# 查看日誌
docker-compose logs -f app
```

應用程式將在 `http://localhost:3000` 可用。

## 📋 系統需求

| 項目 | 最低版本 | 推薦版本 |
|------|---------|---------|
| Node.js | 16.x | 18.x 或更高 |
| pnpm | 7.x | 8.x 或更高 |
| Git | 2.20 | 2.30 或更高 |
| MySQL | 5.7 | 8.0 或更高 |
| Docker（可選） | 20.x | 24.x 或更高 |

## ⚙️ 環境變數配置

### 必需的環境變數

| 變數 | 說明 | 示例 |
|------|------|------|
| `DATABASE_URL` | MySQL 連接字符串 | `mysql://root:pass@localhost:3306/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | `your-secret-key` |
| `VITE_APP_ID` | Manus OAuth 應用 ID | `app-id-123` |
| `OAUTH_SERVER_URL` | OAuth 伺服器 URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 登入入口 | `https://portal.manus.im` |
| `OWNER_OPEN_ID` | 項目所有者 ID | `owner-id-123` |
| `OWNER_NAME` | 項目所有者名稱 | `John Doe` |

### 可選的環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `VITE_APP_TITLE` | 應用程式標題 | `台灣賓果 2026` |
| `VITE_APP_LOGO` | 應用程式 Logo URL | - |
| `NODE_ENV` | 運行環境 | `development` |
| `PORT` | 伺服器端口 | `3000` |

## 🔍 驗證安裝

安裝完成後，您可以通過以下方式驗證：

**1. 檢查應用程式是否正常運行**

訪問 `http://localhost:3000`，應該看到台灣賓果應用程式的主頁。

**2. 運行測試**

```bash
pnpm test
```

所有測試應該通過（除了預先存在的已知失敗）。

**3. 檢查資料庫連接**

```bash
pnpm run db:push
```

如果資料庫連接成功，應該看到遷移完成的消息。

## 🆘 常見問題

### Q: 安裝時出現 "pnpm: command not found" 錯誤

**A:** 請先安裝 pnpm：

```bash
npm install -g pnpm
```

### Q: 資料庫連接失敗

**A:** 檢查以下項目：

1. MySQL 伺服器是否正在運行
2. `DATABASE_URL` 是否正確
3. 資料庫用戶名和密碼是否正確

```bash
# 測試連接
mysql -u root -p -h localhost -D taiwan_bingo
```

### Q: 應用程式啟動後無法訪問

**A:** 檢查以下項目：

1. 應用程式是否正在運行（查看終端輸出）
2. 端口 3000 是否被佔用
3. 防火牆是否阻止了連接

```bash
# 檢查端口是否被佔用
lsof -i :3000
```

### Q: 環境變數配置錯誤

**A:** 確保 `.env.local` 文件存在並包含所有必需的環境變數。您可以參考 `.env.example` 文件獲取完整的配置示例。

## 📚 後續步驟

安裝完成後，您可以：

1. **閱讀 README.md** - 了解應用程式的功能和架構
2. **查看 DEVELOPER.md** - 學習如何擴展應用程式
3. **查看 DEPLOYMENT.md** - 了解如何部署到生產環境
4. **查看 PLAYBOOK.md** - 了解如何在 Manus 平台上部署

## 🤝 獲取幫助

遇到問題？

1. **查看日誌** - 檢查 `.manus-logs/` 目錄中的日誌文件
2. **提交 Issue** - 在 GitHub 上提交 Issue
3. **聯繫支援** - 訪問 https://help.manus.im

## 📄 許可證

該項目採用 MIT 許可證。

---

**最後更新**：2026 年 3 月 22 日  
**版本**：1.0.0  
**維護者**：Manus AI
