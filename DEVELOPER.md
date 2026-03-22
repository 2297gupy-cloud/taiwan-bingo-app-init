# 台灣賓果 2026 - 開發者指南

> 本文檔為開發者提供詳細的技術指引，說明如何擴展應用程式功能、新增自定義模塊與貢獻代碼。

## 🎯 開發者快速入門

### 環境設置

在開始開發前，請確保您的開發環境已安裝以下工具：

**必需工具**：Node.js 18 以上版本、pnpm 8 以上版本、Git 2.30 以上版本。

**推薦工具**：Visual Studio Code、Prettier（代碼格式化）、ESLint（代碼檢查）。

### 本地開發環境配置

**1. 克隆項目**

```bash
git clone https://github.com/your-org/taiwan-bingo-app.git
cd taiwan-bingo-app
```

**2. 安裝依賴**

```bash
pnpm install
```

**3. 配置環境變數**

在項目根目錄建立 `.env.local` 文件：

```bash
DATABASE_URL="mysql://user:password@localhost:3306/taiwan_bingo"
JWT_SECRET="your-secret-key-for-development"
VITE_APP_ID="manus-app-id"
```

**4. 初始化資料庫**

```bash
pnpm run db:push
```

**5. 啟動開發伺服器**

```bash
pnpm run dev
```

應用程式將在 `http://localhost:3000` 啟動，前後端都支援熱模塊替換（HMR）。

## 🏗️ 架構深入理解

### 前端架構

前端採用 React 19 + Vite 的現代化架構。所有頁面組件位於 `client/src/pages/` 目錄，可重用組件位於 `client/src/components/` 目錄。

**路由配置**：應用程式使用 Wouter 進行客戶端路由。所有路由定義位於 `client/src/App.tsx`，採用聲明式路由配置。

**狀態管理**：應用程式使用 React Context 進行全局狀態管理（如用戶認證狀態）。tRPC 的 React Query 集成負責服務器狀態管理，自動處理緩存、重試與失敗恢復。

**樣式系統**：採用 Tailwind CSS 4 進行樣式管理。所有設計令牌（顏色、間距、字體等）定義在 `client/src/index.css` 中的 CSS 變數，確保全局一致性。

**UI 組件庫**：使用 shadcn/ui 作為基礎組件庫，提供現代化、無障礙的 UI 組件。所有組件都支援深色主題與響應式設計。

### 後端架構

後端採用 Express 4 + tRPC 11 的類型安全 RPC 框架。所有業務邏輯通過 tRPC 程序暴露，無需手動定義 REST 路由。

**tRPC 程序**：所有程序定義位於 `server/routers.ts`。程序分為三類：`publicProcedure`（公開訪問）、`protectedProcedure`（需登入）、`adminProcedure`（管理員專用）。

**資料庫查詢**：所有資料庫查詢邏輯位於 `server/db.ts`，返回原始 Drizzle 結果。業務邏輯層（`server/services/`）調用這些查詢助手，進行數據轉換與驗證。

**認證流程**：使用 Manus OAuth 進行用戶認證。認證上下文（`ctx.user`）自動注入到所有 `protectedProcedure` 中，包含用戶 ID、名稱與角色信息。

**錯誤處理**：所有錯誤統一使用 tRPC 的 `TRPCError` 類進行拋出，自動序列化為客戶端友好的錯誤信息。

### 資料庫架構

資料庫採用 MySQL/TiDB + Drizzle ORM 的組合。所有表定義位於 `drizzle/schema.ts`，使用 Drizzle 的 TypeScript-first Schema 定義方式。

**遷移流程**：修改 Schema 後，執行 `pnpm drizzle-kit generate` 生成遷移 SQL 文件，然後通過 `pnpm run db:push` 應用遷移。所有遷移文件位於 `drizzle/migrations/` 目錄，便於版本控制。

**查詢優化**：使用 Drizzle 的查詢構建器進行類型安全的查詢。對於複雜查詢，使用原始 SQL 與參數化查詢避免 SQL 注入。

## 🔧 常見開發任務

### 新增 API 端點

**1. 定義資料庫查詢**

在 `server/db.ts` 中新增查詢函數：

```typescript
export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}
```

**2. 定義業務邏輯**

在 `server/services/` 中新增業務邏輯模塊（如 `user-service.ts`）：

```typescript
export async function getUserProfile(userId: string) {
  const user = await getUserById(userId);
  if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
  return { id: user.id, name: user.name };
}
```

**3. 暴露 tRPC 程序**

在 `server/routers.ts` 中新增程序：

```typescript
export const appRouter = router({
  user: router({
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserProfile(ctx.user.id);
      }),
  }),
});
```

**4. 前端調用**

在 React 組件中使用 tRPC Hook：

```typescript
const { data, isLoading } = trpc.user.getProfile.useQuery();
```

### 新增數據庫表

**1. 定義 Schema**

在 `drizzle/schema.ts` 中新增表定義：

```typescript
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**2. 生成遷移**

```bash
pnpm drizzle-kit generate
```

系統將在 `drizzle/migrations/` 中生成 SQL 遷移文件。

**3. 應用遷移**

```bash
pnpm run db:push
```

**4. 更新類型定義**

Drizzle 將自動生成 TypeScript 類型。在 `server/db.ts` 中導入新表：

```typescript
import { articles } from '@/drizzle/schema';
```

### 新增前端頁面

**1. 建立頁面組件**

在 `client/src/pages/` 中建立新文件（如 `ArticlesPage.tsx`）：

```typescript
import { trpc } from '@/lib/trpc';

export function ArticlesPage() {
  const { data: articles } = trpc.articles.list.useQuery();
  
  return (
    <div className="container">
      <h1>文章列表</h1>
      {articles?.map(article => (
        <div key={article.id} className="card">
          <h2>{article.title}</h2>
          <p>{article.content}</p>
        </div>
      ))}
    </div>
  );
}
```

**2. 註冊路由**

在 `client/src/App.tsx` 中新增路由：

```typescript
<Route path="/articles" component={ArticlesPage} />
```

**3. 新增導航項**

在 `client/src/components/TabBar.tsx` 中新增導航項：

```typescript
<Link href="/articles" className="tab-item">
  文章
</Link>
```

### 新增 AI 功能

應用程式內建 LLM 集成，支援使用 OpenAI、Gemini 等模型進行 AI 分析。

**1. 在後端調用 LLM**

在 `server/services/` 中的業務邏輯模塊中使用 LLM：

```typescript
import { invokeLLM } from '@/server/_core/llm';

export async function analyzeText(text: string) {
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: `Analyze this text: ${text}` },
    ],
  });
  
  return response.choices[0].message.content;
}
```

**2. 暴露 tRPC 程序**

```typescript
export const appRouter = router({
  ai: router({
    analyze: protectedProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        return analyzeText(input.text);
      }),
  }),
});
```

**3. 前端調用**

```typescript
const mutation = trpc.ai.analyze.useMutation();

async function handleAnalyze() {
  const result = await mutation.mutateAsync({ text: userInput });
  console.log(result);
}
```

### 新增數據同步功能

應用程式支援從外部數據源（如 Google Sheets）同步數據。

**1. 建立同步服務**

在 `server/services/` 中建立同步模塊（如 `external-sync.ts`）：

```typescript
export async function syncFromExternalAPI() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  
  for (const item of data) {
    await db.insert(articles).values({
      id: generateId(),
      title: item.title,
      content: item.content,
      createdAt: new Date(),
    });
  }
}
```

**2. 暴露管理員 API**

```typescript
export const appRouter = router({
  admin: router({
    syncExternal: adminProcedure
      .mutation(async () => {
        return syncFromExternalAPI();
      }),
  }),
});
```

## 📝 代碼規範與最佳實踐

### 命名規範

**文件名**：使用 kebab-case（如 `user-service.ts`）。React 組件文件使用 PascalCase（如 `UserCard.tsx`）。

**變數名**：使用 camelCase（如 `userId`、`userName`）。常量使用 UPPER_SNAKE_CASE（如 `MAX_RETRIES`）。

**函數名**：使用 camelCase，動詞開頭（如 `getUserById`、`calculateTotal`）。

**類型名**：使用 PascalCase（如 `User`、`DrawRecord`）。

### 代碼風格

**格式化**：使用 Prettier 進行自動代碼格式化。在 `package.json` 中配置 Prettier 規則。

**Linting**：使用 ESLint 進行代碼檢查。所有代碼必須通過 ESLint 檢查才能提交。

**類型安全**：盡量使用 TypeScript 的類型系統，避免使用 `any` 類型。對於複雜類型，使用 Zod 進行運行時驗證。

**錯誤處理**：所有異步操作都應正確處理錯誤。在後端使用 `try-catch` 與 `TRPCError`，在前端使用 tRPC 的錯誤處理機制。

### 測試規範

**單元測試**：使用 Vitest 編寫單元測試。測試文件位於 `server/*.test.ts`，測試覆蓋率應不低於 80%。

**測試結構**：使用 `describe` 組織測試套件，使用 `it` 編寫單個測試用例。

**測試示例**：

```typescript
describe('getUserById', () => {
  it('should return user when found', async () => {
    const user = await getUserById('user-123');
    expect(user).toBeDefined();
    expect(user.id).toBe('user-123');
  });

  it('should return null when not found', async () => {
    const user = await getUserById('non-existent');
    expect(user).toBeNull();
  });
});
```

**運行測試**：

```bash
pnpm test
```

## 🔄 貢獻工作流程

### Fork 與 Clone

**1. Fork 項目**

在 GitHub 上點擊「Fork」按鈕，將項目複製到您的帳戶。

**2. Clone 到本地**

```bash
git clone https://github.com/your-username/taiwan-bingo-app.git
cd taiwan-bingo-app
```

**3. 新增上游遠程**

```bash
git remote add upstream https://github.com/original-org/taiwan-bingo-app.git
```

### 建立功能分支

**1. 同步上游代碼**

```bash
git fetch upstream
git rebase upstream/main
```

**2. 建立功能分支**

```bash
git checkout -b feature/add-new-feature
```

分支名應清晰描述功能（如 `feature/ai-prediction`、`fix/google-sync-bug`）。

### 提交代碼

**1. 進行修改**

在本地進行代碼修改，確保所有修改都通過 ESLint 與 Prettier 檢查。

**2. 運行測試**

```bash
pnpm test
```

確保所有測試都通過，新功能應包含相應的單元測試。

**3. 提交更改**

```bash
git add .
git commit -m "feat: add new feature description"
```

遵循 Conventional Commits 規範：

- `feat:` - 新功能
- `fix:` - Bug 修復
- `docs:` - 文檔更新
- `style:` - 代碼格式化（不影響功能）
- `refactor:` - 代碼重構
- `test:` - 測試相關
- `chore:` - 構建、依賴等

### 推送與 Pull Request

**1. 推送分支**

```bash
git push origin feature/add-new-feature
```

**2. 建立 Pull Request**

在 GitHub 上建立 Pull Request，清晰描述修改內容、相關 Issue、測試方法等。

**3. 代碼審查**

項目維護者將審查您的代碼。根據反饋進行修改，推送新的提交。

**4. 合併**

代碼審查通過後，維護者將合併您的 Pull Request。

## 🚀 性能優化

### 前端性能優化

**代碼分割**：使用 React 的 `lazy` 與 `Suspense` 進行路由級別的代碼分割，減少初始加載時間。

**圖片優化**：使用 WebP 格式與響應式圖片，通過 CDN 進行圖片優化與緩存。

**緩存策略**：利用 tRPC 的 React Query 集成進行智能緩存。對於不經常變化的數據，設置較長的緩存時間。

**虛擬滾動**：對於大列表，使用虛擬滾動庫（如 `react-window`）避免渲染所有項目。

### 後端性能優化

**資料庫索引**：為經常查詢的字段建立索引。使用 `EXPLAIN` 分析查詢性能。

**查詢優化**：避免 N+1 查詢問題，使用 JOIN 或批量查詢。

**緩存層**：對於熱點數據，使用 Redis 進行緩存。

**連接池**：配置適當的資料庫連接池大小，避免連接耗盡。

## 🔐 安全最佳實踐

### 認證與授權

**認證**：使用 Manus OAuth 進行用戶認證，所有敏感操作都應要求登入。

**授權**：使用 `protectedProcedure` 與 `adminProcedure` 進行授權檢查。在業務邏輯中驗證用戶權限。

**會話管理**：使用 JWT 進行會話管理，設置適當的過期時間。

### 數據安全

**輸入驗證**：使用 Zod 對所有用戶輸入進行驗證，防止注入攻擊。

**SQL 注入防護**：使用參數化查詢，避免直接拼接 SQL。

**敏感數據加密**：對於密碼等敏感數據，使用加密算法進行存儲。

**HTTPS**：所有通信都應使用 HTTPS，Manus 平台自動配置 SSL 憑證。

### API 安全

**速率限制**：對 API 端點進行速率限制，防止濫用。

**CORS 配置**：正確配置 CORS 策略，只允許信任的域名訪問。

**API 金鑰管理**：對於第三方 API 金鑰，使用環境變數進行存儲，不要提交到版本控制。

## 📚 資源與參考

### 官方文檔

- **React 文檔**：[https://react.dev](https://react.dev)
- **Express 文檔**：[https://expressjs.com](https://expressjs.com)
- **tRPC 文檔**：[https://trpc.io](https://trpc.io)
- **Drizzle ORM 文檔**：[https://orm.drizzle.team](https://orm.drizzle.team)
- **Tailwind CSS 文檔**：[https://tailwindcss.com](https://tailwindcss.com)

### 開發工具

- **Visual Studio Code**：[https://code.visualstudio.com](https://code.visualstudio.com)
- **Prettier**：[https://prettier.io](https://prettier.io)
- **ESLint**：[https://eslint.org](https://eslint.org)
- **Vitest**：[https://vitest.dev](https://vitest.dev)

### 社區資源

- **GitHub Issues**：報告 Bug 與功能請求
- **GitHub Discussions**：討論設計與實現方案
- **Manus 社區論壇**：[https://community.manus.im](https://community.manus.im)

## 🤝 獲取幫助

若在開發過程中遇到問題，可通過以下方式獲取幫助：

**查看現有 Issue**：在 GitHub 上搜索相似的 Issue，可能已有解決方案。

**提交新 Issue**：詳細描述問題、復現步驟、預期行為與實際行為。

**聯繫維護者**：通過 GitHub Discussions 或郵件聯繫項目維護者。

**Manus 支援**：訪問 [https://help.manus.im](https://help.manus.im) 獲取平台相關支援。

## 📄 許可證

該項目採用 MIT 許可證。所有貢獻都應遵守該許可證條款。

---

**最後更新**：2026 年 3 月 22 日  
**版本**：1.0.0  
**維護者**：Manus AI
