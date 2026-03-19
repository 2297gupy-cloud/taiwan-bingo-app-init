#!/usr/bin/env node

/**
 * Manus 專案快速啟動腳本
 * 用於自動化初始化和配置 Manus 專案
 * 執行方式：node manus-quick-start.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${"=".repeat(60)}`, "blue");
  log(title, "bright");
  log(`${"=".repeat(60)}\n`, "blue");
}

async function quickStart() {
  try {
    logSection("🚀 Manus 台灣賓果應用快速啟動");

    // 步驟 1：檢查前置需求
    logSection("📋 步驟 1：檢查前置需求");
    log("✓ 檢查 Node.js 版本...");
    const nodeVersion = execSync("node --version").toString().trim();
    log(`  Node.js 版本：${nodeVersion}`, "green");

    log("✓ 檢查 pnpm 版本...");
    const pnpmVersion = execSync("pnpm --version").toString().trim();
    log(`  pnpm 版本：${pnpmVersion}`, "green");

    // 步驟 2：安裝依賴
    logSection("📦 步驟 2：安裝依賴");
    log("正在執行 pnpm install...");
    execSync("pnpm install", { stdio: "inherit", cwd: __dirname });
    log("✓ 依賴安裝完成", "green");

    // 步驟 3：生成資料庫遷移
    logSection("🗄️  步驟 3：生成資料庫遷移");
    log("正在執行 pnpm drizzle-kit generate...");
    execSync("pnpm drizzle-kit generate", { stdio: "inherit", cwd: __dirname });
    log("✓ 資料庫遷移生成完成", "green");
    log("⚠️  請手動執行資料庫遷移 SQL（使用 webdev_execute_sql）", "yellow");

    // 步驟 4：檢查環境變數
    logSection("🔐 步驟 4：檢查環境變數");
    const envFile = path.join(__dirname, ".env");
    if (fs.existsSync(envFile)) {
      log("✓ .env 檔案已存在", "green");
    } else {
      log("⚠️  .env 檔案不存在，請建立並設定以下變數：", "yellow");
      const envVars = [
        "DATABASE_URL",
        "JWT_SECRET",
        "VITE_APP_ID",
        "OAUTH_SERVER_URL",
        "VITE_OAUTH_PORTAL_URL",
        "BUILT_IN_FORGE_API_URL",
        "BUILT_IN_FORGE_API_KEY",
      ];
      envVars.forEach(v => log(`  - ${v}`));
    }

    // 步驟 5：初始化種子資料
    logSection("🌱 步驟 5：初始化種子資料");
    log("正在執行 node seed-data.mjs...");
    try {
      execSync("node seed-data.mjs", { stdio: "inherit", cwd: __dirname });
      log("✓ 種子資料初始化完成", "green");
    } catch (error) {
      log("⚠️  種子資料初始化失敗（可能是資料庫未連接）", "yellow");
    }

    // 步驟 6：初始化 UI 配置
    logSection("🎨 步驟 6：初始化 UI 配置");
    log("正在執行 node init-ui-config.mjs...");
    try {
      execSync("node init-ui-config.mjs", { stdio: "inherit", cwd: __dirname });
      log("✓ UI 配置初始化完成", "green");
    } catch (error) {
      log("⚠️  UI 配置初始化失敗（可能是資料庫未連接）", "yellow");
    }

    // 步驟 7：執行測試
    logSection("✅ 步驟 7：執行測試");
    log("正在執行 pnpm test...");
    execSync("pnpm test", { stdio: "inherit", cwd: __dirname });
    log("✓ 所有測試通過", "green");

    // 完成
    logSection("🎉 快速啟動完成！");
    log("下一步操作：", "bright");
    log("1. 啟動開發伺服器：pnpm dev", "blue");
    log("2. 在瀏覽器中打開：http://localhost:3000", "blue");
    log("3. 查看文檔：UI-CONFIG-GUIDE.md", "blue");
    log("\n✨ 祝您使用愉快！", "green");

  } catch (error) {
    log(`\n❌ 快速啟動失敗：${error.message}`, "red");
    process.exit(1);
  }
}

// 執行快速啟動
quickStart();
