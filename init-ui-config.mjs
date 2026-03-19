/**
 * UI 配置初始化腳本
 * 用於將台灣賓果 APP V2 的完整介面配置上傳到資料庫
 * 執行方式：node init-ui-config.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { uiConfigTemplates } from "./drizzle/ui-config-schema.ts";
import { taiwanBingoV2Config } from "./server/ui-config-export.ts";

const db = drizzle(process.env.DATABASE_URL);

async function initUIConfig() {
  try {
    console.log("🚀 開始初始化 UI 配置...");
    console.log("📝 配置名稱:", taiwanBingoV2Config.name);
    console.log("📌 版本:", taiwanBingoV2Config.version);
    console.log("📊 頁面數:", taiwanBingoV2Config.pagesConfig.length);
    console.log("🔗 API 端點數:", taiwanBingoV2Config.apiConfig.endpoints.length);
    console.log("🗄️  資料庫表數:", taiwanBingoV2Config.databaseConfig.tables.length);

    // 檢查是否已存在相同名稱的配置
    const existing = await db
      .select()
      .from(uiConfigTemplates)
      .where(eq(uiConfigTemplates.name, taiwanBingoV2Config.name))
      .limit(1);

    if (existing.length > 0) {
      console.log("⚠️  配置已存在，正在更新...");
      await db
        .update(uiConfigTemplates)
        .set({
          ...taiwanBingoV2Config,
          updatedAt: new Date(),
        })
        .where(eq(uiConfigTemplates.name, taiwanBingoV2Config.name));
      console.log("✅ 配置已更新");
    } else {
      console.log("➕ 正在建立新配置...");
      await db.insert(uiConfigTemplates).values({
        ...taiwanBingoV2Config,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ 配置已建立");
    }

    console.log("\n✨ UI 配置初始化完成！");
    console.log("📌 配置可透過以下 API 存取：");
    console.log("   GET /api/trpc/uiConfig.getTaiwanBingoV2");
    console.log("   GET /api/trpc/uiConfig.exportAsJSON");
    console.log("   GET /api/trpc/uiConfig.getSummary");

    process.exit(0);
  } catch (error) {
    console.error("❌ 初始化失敗:", error);
    process.exit(1);
  }
}

initUIConfig();
