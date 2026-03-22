# 台灣賓果 2026 - Manus Playbook 指南

> 本文檔說明如何在 Manus 平台上使用 Playbook 功能一鍵複製並部署台灣賓果應用程式。

## 📚 什麼是 Manus Playbook？

Manus Playbook 是一種可複用的任務模板，允許用戶快速複製並執行預先配置的工作流程。與傳統的手動部署不同，Playbook 提供了以下優勢：

**自動化部署**：無需手動配置環境、安裝依賴或執行遷移命令，系統將自動完成所有初始化步驟。

**一致的環境**：所有用戶部署的應用程式都基於相同的源代碼與配置，確保功能與外觀的一致性。

**快速迭代**：新用戶可在 5 分鐘內完成從複製到上線的全流程，無需深入了解技術細節。

**版本控制**：每個 Playbook 版本都對應一個 Git 提交，用戶可輕鬆回滾到任何歷史版本。

## 🚀 快速開始

### 方法一：使用 Manus Explore 頁面（推薦）

這是最直觀的方式，適合大多數用戶。

**1. 訪問 Manus Explore**

在 Manus 平台的左側選單中點擊「Explore」，進入公開 Playbook 市場。

**2. 搜尋台灣賓果應用**

在搜尋欄中輸入「台灣賓果」或「Taiwan Bingo」，找到「台灣賓果 2026 - AI 智能預測平台」。

**3. 點擊「Use this Playbook」**

在 Playbook 卡片上點擊「Use this Playbook」按鈕。系統將跳轉到新任務頁面。

**4. 確認部署參數**

系統將顯示部署前的配置確認頁面。您可以修改以下參數：

- **應用程式名稱**：預設為「taiwan-bingo-app」，可自定義
- **自定義域名**：可選，留空則使用 Manus 自動生成的域名
- **資料庫配置**：系統將自動配置 MySQL 資料庫

**5. 點擊「Deploy」**

確認無誤後，點擊「Deploy」按鈕。系統將開始部署流程，通常需要 2~3 分鐘。

**6. 等待部署完成**

部署過程中，您可在頁面上看到實時的部署日誌。部署完成後，系統將顯示應用程式的訪問 URL。

### 方法二：從 GitHub 直接部署

若您已有 GitHub 帳戶並希望自定義代碼，可使用此方法。

**1. Fork 項目到您的 GitHub**

訪問 [台灣賓果 GitHub 項目](https://github.com/your-org/taiwan-bingo-app)，點擊「Fork」按鈕。

**2. 在 Manus 中新建任務**

在 Manus 平台點擊「New Task」，選擇「Deploy from GitHub」。

**3. 輸入 GitHub 項目 URL**

在文本框中輸入您 Fork 後的項目 URL（例如 `https://github.com/your-username/taiwan-bingo-app`）。

**4. 執行部署命令**

在對話框中輸入以下命令：

```
Help me deploy this repository: https://github.com/your-username/taiwan-bingo-app
```

Manus 將自動分析項目結構、安裝依賴並部署應用程式。

### 方法三：手動複製（進階用戶）

若您希望完全控制部署流程，可手動複製項目。

**1. 克隆項目到本地**

```bash
git clone https://github.com/your-org/taiwan-bingo-app.git
cd taiwan-bingo-app
```

**2. 安裝依賴**

```bash
pnpm install
```

**3. 配置環境變數**

在項目根目錄建立 `.env.local` 文件，配置以下變數：

```bash
DATABASE_URL="mysql://user:password@localhost:3306/taiwan_bingo"
JWT_SECRET="your-secret-key"
```

**4. 執行資料庫遷移**

```bash
pnpm run db:push
```

**5. 啟動開發伺服器**

```bash
pnpm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

## 🔧 部署後配置

部署完成後，您需要執行以下配置步驟以完全激活應用程式。

### 配置 Google Sheets 同步

應用程式支援從 Google 試算表同步開獎數據。若要啟用此功能，請執行以下步驟：

**1. 準備 Google 試算表**

建立一個 Google 試算表，包含以下列：期別、日期、時間、開獎號碼、超級獎號、大小、單雙。每個日期應為一個獨立的分頁，命名格式為 `bingo_YYYY-MM-DD`（例如 `bingo_2026-03-21`）。

**2. 建立 Google Apps Script**

在 Google 試算表中，點擊「擴充功能」→「Apps Script」，貼上以下代碼：

```javascript
function doGet(e) {
  const params = e.parameter;
  const action = params.action || "today";
  const date = params.date;
  
  if (action === "date" && date) {
    return getSheetData("bingo_" + date);
  } else {
    return getSheetData(getTodaySheetName());
  }
}

function getTodaySheetName() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `bingo_${year}-${month}-${day}`;
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, data: [] }));
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    records.push({
      period: row[0],
      date: row[1],
      time: row[2],
      numbers: String(row[3]).split(" "),
      superNum: row[4],
      size: row[5],
      oe: row[6],
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: records }));
}
```

**3. 部署 Google Apps Script**

點擊「部署」→「新增部署」，選擇「Web 應用程式」。在「執行身份」中選擇您的帳戶，在「誰可以存取」中選擇「任何人」。點擊「部署」並複製生成的 URL。

**4. 在應用程式中配置 API URL**

在 Manus 管理介面中，進入應用程式設定，將 Google Apps Script 的 URL 配置到環境變數 `GOOGLE_SHEETS_API_URL`。

### 配置 AI 預測（可選）

應用程式支援使用 LLM（大語言模型）進行 AI 黃金球預測。若要啟用此功能，請執行以下步驟：

**1. 獲取 API 金鑰**

訪問 [OpenAI](https://platform.openai.com) 或 [Google Gemini](https://ai.google.dev) 官網，申請 API 金鑰。

**2. 在應用程式中配置 API 金鑰**

在 AI 一星頁面點擊「API Key 設定」，輸入您的 API 金鑰。系統將加密存儲該金鑰。

**3. 驗證配置**

點擊「測試連接」按鈕，系統將驗證 API 金鑰的有效性。

### 配置自定義域名

若要使用自定義域名而非 Manus 自動生成的域名，請執行以下步驟：

**1. 購買域名**

在 Manus 管理介面的「Settings」→「Domains」中，您可以直接購買新域名或綁定現有域名。

**2. 配置 DNS 記錄**

按照 Manus 提供的指引，在您的域名註冊商中配置 DNS 記錄。系統將自動驗證 DNS 配置。

**3. 啟用 SSL 憑證**

Manus 將自動為您的自定義域名配置 Let's Encrypt SSL 憑證，無需手動操作。

## 📊 監控與維護

部署完成後，您可在 Manus 管理介面中監控應用程式的運行狀態。

### 查看應用程式日誌

在「Dashboard」面板中，您可查看以下日誌：

- **伺服器日誌**（devserver.log）：顯示後端伺服器的啟動、錯誤與警告信息
- **瀏覽器日誌**（browserConsole.log）：顯示前端 JavaScript 控制台的輸出
- **網絡請求日誌**（networkRequests.log）：顯示所有 HTTP 請求的詳細信息
- **用戶交互日誌**（sessionReplay.log）：記錄用戶的點擊、導航等交互事件

### 監控應用程式性能

在「Dashboard」的「Analytics」部分，您可查看以下指標：

- **訪問量（UV/PV）**：每日/每月的獨立訪客數與頁面瀏覽量
- **平均響應時間**：API 請求的平均響應延遲
- **錯誤率**：應用程式的錯誤發生率
- **資料庫連接狀態**：資料庫連接的健康狀態

### 自動備份與恢復

Manus 平台會自動為您的應用程式建立備份。您可在「Checkpoints」面板中查看所有歷史版本，並隨時回滾到任何版本。

## 🔄 更新與升級

當項目發佈新版本時，您可輕鬆升級應用程式。

### 自動更新通知

Manus 將在新版本發佈時發送通知。您可在「Checkpoints」面板中查看可用的更新。

### 手動升級

**1. 拉取最新代碼**

若您是從 GitHub 部署的，可在本地執行以下命令拉取最新代碼：

```bash
git pull origin main
```

**2. 執行資料庫遷移**

若新版本包含資料庫 Schema 變更，執行以下命令：

```bash
pnpm run db:push
```

**3. 重新部署**

在 Manus 管理介面中點擊「Publish」按鈕，系統將重新構建並部署應用程式。

### 版本回滾

若升級後出現問題，您可輕鬆回滾到上一個版本：

**1. 進入 Checkpoints 面板**

在 Manus 管理介面中點擊「Checkpoints」。

**2. 選擇目標版本**

找到要回滾到的版本，點擊「Rollback」按鈕。

**3. 確認回滾**

系統將提示確認回滾操作。確認後，應用程式將恢復到該版本的狀態。

## 🆘 故障排除

### 常見問題

**Q：部署後應用程式無法訪問**

A：請檢查以下幾點：
- 確認部署已完成（查看 Dashboard 中的部署狀態）
- 確認資料庫連接正常（在 Database 面板中測試連接）
- 查看伺服器日誌中是否有錯誤信息

**Q：Google Sheets 同步失敗**

A：請檢查以下幾點：
- 確認 Google Apps Script 已正確部署
- 確認試算表分頁名稱格式正確（`bingo_YYYY-MM-DD`）
- 確認 Google Apps Script URL 已在應用程式中正確配置

**Q：AI 預測功能不工作**

A：請檢查以下幾點：
- 確認 API 金鑰已正確配置
- 確認 API 金鑰有足夠的配額
- 查看瀏覽器控制台中是否有錯誤信息

### 聯繫支援

若遇到無法解決的問題，請通過以下方式聯繫 Manus 支援團隊：

- **Manus 幫助中心**：[https://help.manus.im](https://help.manus.im)
- **郵件支援**：support@manus.im
- **社區論壇**：[https://community.manus.im](https://community.manus.im)

## 📖 進階配置

### 自定義應用程式設定

應用程式的許多功能可通過環境變數進行自定義。以下是常用的配置選項：

| 環境變數 | 說明 | 預設值 |
|---------|------|--------|
| `VITE_APP_TITLE` | 應用程式標題 | 台灣賓果 2026 |
| `VITE_APP_LOGO` | 應用程式 Logo URL | 內建 Logo |
| `AI_MODEL` | LLM 模型選擇 | gpt-4-turbo |
| `GOOGLE_SHEETS_API_URL` | Google Sheets API URL | 無 |
| `DATABASE_POOL_SIZE` | 資料庫連接池大小 | 10 |

### 擴展應用程式功能

應用程式採用模塊化架構，支援輕鬆擴展新功能。詳見 [開發者指南](DEVELOPER.md)。

## 📝 許可證與條款

該 Playbook 及應用程式採用 MIT 許可證。詳見 [LICENSE](LICENSE) 文件。

使用該 Playbook 部署的應用程式應遵守以下條款：

- 應用程式僅供個人學習與研究使用
- 禁止將應用程式用於商業目的或非法活動
- 用戶對應用程式的使用行為負全部責任
- 開發者不對應用程式的準確性或可用性做任何保證

## 🙏 致謝

感謝所有為該項目做出貢獻的開發者與用戶。若您有功能建議或 Bug 報告，歡迎在 GitHub 上提交 Issue。

---

**最後更新**：2026 年 3 月 22 日  
**Playbook 版本**：1.0.0  
**維護者**：Manus AI  
**相容 Manus 版本**：v2.0 及以上
