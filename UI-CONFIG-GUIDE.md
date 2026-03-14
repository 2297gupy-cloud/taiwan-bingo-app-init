# UI 配置系統使用指南

## 概述

台灣賓果 APP V2 現已支援完整的 UI 配置管理系統，允許使用者直接從資料庫載入預先配置的介面，無需重新建立畫面。

## 核心功能

### 1. UI 配置範本 (UI Config Templates)

存儲完整的 APP 介面配置，包括：
- **主題配置**：深色/淺色主題、顏色方案、字體
- **頁面佈局**：頁面結構、導航配置、分頁設定
- **組件配置**：所有 UI 組件的樣式和屬性
- **API 配置**：後端 API 端點清單
- **資料庫配置**：資料庫表結構

### 2. 使用者 UI 配置 (User UI Configs)

允許使用者基於範本建立自訂配置，保存個人偏好設定。

### 3. UI 組件庫 (UI Components)

儲存可重用的 UI 組件配置，包括：
- 組件名稱和類型
- Props 架構定義
- 樣式配置
- 預覽 HTML 和範例程式碼

## 資料庫表結構

### ui_config_templates
```sql
CREATE TABLE ui_config_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  appType VARCHAR(50) NOT NULL DEFAULT 'bingo',
  themeConfig JSON NOT NULL,
  layoutConfig JSON NOT NULL,
  pagesConfig JSON NOT NULL,
  navigationConfig JSON NOT NULL,
  componentLibrary JSON NOT NULL,
  apiConfig JSON NOT NULL,
  databaseConfig JSON NOT NULL,
  isPublic BOOLEAN NOT NULL DEFAULT FALSE,
  createdBy VARCHAR(64),
  downloadCount INT DEFAULT 0,
  rating INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### user_ui_configs
```sql
CREATE TABLE user_ui_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(64) NOT NULL,
  configName VARCHAR(255) NOT NULL,
  baseTemplateId INT,
  config JSON NOT NULL,
  isDefault BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### ui_components
```sql
CREATE TABLE ui_components (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  propsSchema JSON NOT NULL,
  styleConfig JSON NOT NULL,
  previewHTML TEXT,
  exampleCode TEXT,
  createdBy VARCHAR(64),
  isPublic BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API 端點

### 獲取台灣賓果 V2 完整 UI 配置
```
GET /api/trpc/uiConfig.getTaiwanBingoV2
```

**回應範例**：
```json
{
  "name": "台灣賓果開獎網 V2",
  "version": "2.0.0",
  "appType": "bingo",
  "themeConfig": { ... },
  "layoutConfig": { ... },
  "pagesConfig": [ ... ],
  "navigationConfig": { ... },
  "componentLibrary": { ... },
  "apiConfig": { ... },
  "databaseConfig": { ... }
}
```

### 匯出 UI 配置為 JSON
```
GET /api/trpc/uiConfig.exportAsJSON
```

**回應範例**：
```json
{
  "json": "{ ... }",
  "timestamp": "2026-03-13T12:00:00.000Z"
}
```

### 獲取 UI 配置摘要
```
GET /api/trpc/uiConfig.getSummary
```

**回應範例**：
```json
{
  "name": "台灣賓果開獎網 V2",
  "version": "2.0.0",
  "appType": "bingo",
  "description": "台灣賓果即時開獎、AI預測、歷史紀錄、走勢分析完整應用",
  "pageCount": 3,
  "navigationItemCount": 7,
  "apiEndpointCount": 7,
  "databaseTableCount": 2
}
```

## 初始化 UI 配置

### 1. 建立遷移 SQL
```bash
pnpm drizzle-kit generate
```

### 2. 執行遷移
```bash
# 使用 webdev_execute_sql 執行遷移 SQL
```

### 3. 初始化配置
```bash
node init-ui-config.mjs
```

## 使用場景

### 場景 1：新使用者快速開始
1. 調用 `uiConfig.getTaiwanBingoV2` 獲取完整配置
2. 前端根據配置動態渲染頁面
3. 無需手動建立任何 UI 元素

### 場景 2：使用者自訂配置
1. 基於現有範本建立新配置
2. 修改顏色、佈局、導航等
3. 保存為個人配置

### 場景 3：組件庫重用
1. 從 `ui_components` 表查詢組件
2. 在其他專案中重用相同配置
3. 保持 UI 一致性

## 擴展指南

### 添加新的 UI 配置範本

```typescript
import { saveUIConfigTemplate } from "./server/ui-config-db";

const newTemplate = {
  name: "我的自訂應用",
  version: "1.0.0",
  appType: "custom",
  description: "自訂應用描述",
  themeConfig: { ... },
  layoutConfig: { ... },
  pagesConfig: [ ... ],
  navigationConfig: { ... },
  componentLibrary: { ... },
  apiConfig: { ... },
  databaseConfig: { ... },
  isPublic: true,
  createdBy: "user-id",
};

await saveUIConfigTemplate(newTemplate);
```

### 添加新的 UI 組件

```typescript
import { saveUIComponent } from "./server/ui-config-db";

const newComponent = {
  name: "CustomButton",
  type: "button",
  description: "自訂按鈕組件",
  propsSchema: {
    label: { type: "string", required: true },
    size: { type: "string", options: ["sm", "md", "lg"] },
    variant: { type: "string", options: ["primary", "secondary"] },
  },
  styleConfig: {
    className: "px-4 py-2 rounded",
    variants: {
      primary: { className: "bg-primary text-white" },
      secondary: { className: "bg-secondary text-black" },
    },
  },
  isPublic: true,
  createdBy: "user-id",
};

await saveUIComponent(newComponent);
```

## 最佳實踐

1. **版本控制**：每次更新配置時遞增版本號
2. **文檔化**：為每個配置添加詳細描述
3. **模組化**：將大型配置分解為多個小型範本
4. **測試**：在生產環境前充分測試配置
5. **備份**：定期備份重要配置

## 故障排除

### 問題：配置未顯示
- 檢查 `isPublic` 是否設為 `true`
- 確認資料庫連接正常
- 驗證 API 端點是否正確

### 問題：組件樣式不生效
- 檢查 `styleConfig` 中的 CSS 類名
- 確認 Tailwind CSS 配置包含相應類名
- 驗證 `className` 語法正確

## 相關文件

- [UI 配置匯出工具](./server/ui-config-export.ts)
- [UI 配置資料庫操作](./server/ui-config-db.ts)
- [UI 配置 Schema](./drizzle/ui-config-schema.ts)
- [初始化腳本](./init-ui-config.mjs)
