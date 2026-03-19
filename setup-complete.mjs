#!/usr/bin/env node

/**
 * 台灣賓果應用 - 完整一鍵啟動系統
 * 
 * 此腳本自動化完成以下所有步驟：
 * 1. 檢查系統環境和依賴
 * 2. 安裝 npm 依賴
 * 3. 生成資料庫遷移 SQL
 * 4. 執行資料庫初始化和種子資料導入
 * 5. 初始化 UI 配置
 * 6. 執行完整測試
 * 7. 啟動開發伺服器
 * 
 * 使用方式：
 *   node setup-complete.mjs
 * 
 * 或指定特定步驟：
 *   node setup-complete.mjs --skip-tests
 *   node setup-complete.mjs --db-only
 *   node setup-complete.mjs --dev-only
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 顏色定義
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

// 日誌函數
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${"=".repeat(70)}`, "blue");
  log(title, "bright");
  log(`${"=".repeat(70)}\n`, "blue");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "cyan");
}

// 詢問用戶
async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// 執行命令
function executeCommand(command, description, options = {}) {
  try {
    log(`執行: ${command}`, "dim");
    execSync(command, {
      stdio: options.silent ? "pipe" : "inherit",
      cwd: __dirname,
      ...options,
    });
    logSuccess(description);
    return true;
  } catch (error) {
    logError(`${description} 失敗`);
    if (!options.silent) {
      console.error(error.message);
    }
    return false;
  }
}

// 檢查文件存在
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

// 讀取環境變數
function loadEnv() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) {
    return {};
  }

  const content = fs.readFileSync(envFile, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
  return env;
}

// 主函數
async function main() {
  try {
    logSection("🚀 台灣賓果應用 - 完整一鍵啟動系統");

    // 解析命令行參數
    const args = process.argv.slice(2);
    const skipTests = args.includes("--skip-tests");
    const dbOnly = args.includes("--db-only");
    const devOnly = args.includes("--dev-only");

    // 步驟 1：檢查前置需求
    if (!dbOnly && !devOnly) {
      logSection("📋 步驟 1：檢查前置需求");

      try {
        const nodeVersion = execSync("node --version", { encoding: "utf-8" }).trim();
        logSuccess(`Node.js 版本：${nodeVersion}`);

        const pnpmVersion = execSync("pnpm --version", { encoding: "utf-8" }).trim();
        logSuccess(`pnpm 版本：${pnpmVersion}`);

        logInfo("所有前置需求檢查完成");
      } catch (error) {
        logError("前置需求檢查失敗");
        process.exit(1);
      }
    }

    // 步驟 2：安裝依賴
    if (!dbOnly && !devOnly) {
      logSection("📦 步驟 2：安裝依賴");
      if (!executeCommand("pnpm install", "依賴安裝完成")) {
        logError("無法安裝依賴，請檢查網絡連接");
        process.exit(1);
      }
    }

    // 步驟 3：檢查環境變數
    if (!dbOnly && !devOnly) {
      logSection("🔐 步驟 3：檢查環境變數");
      const env = loadEnv();
      const requiredEnvVars = [
        "DATABASE_URL",
        "JWT_SECRET",
        "VITE_APP_ID",
        "OAUTH_SERVER_URL",
      ];

      const missingVars = requiredEnvVars.filter((v) => !env[v]);

      if (missingVars.length > 0) {
        logWarning("以下環境變數未設定：");
        missingVars.forEach((v) => log(`  - ${v}`));
        logInfo("請在 .env 檔案中設定這些變數");
        logInfo("參考 .env.example 檔案獲取更多信息");

        const proceed = await askQuestion("是否繼續？(y/n): ");
        if (proceed.toLowerCase() !== "y") {
          process.exit(1);
        }
      } else {
        logSuccess("所有必需的環境變數已設定");
      }
    }

    // 步驟 4：生成資料庫遷移
    if (!devOnly) {
      logSection("🗄️  步驟 4：生成資料庫遷移");
      executeCommand(
        "pnpm drizzle-kit generate",
        "資料庫遷移生成完成"
      );
    }

    // 步驟 5：執行資料庫初始化
    if (!devOnly) {
      logSection("🗄️  步驟 5：執行資料庫初始化");
      logWarning("請使用 Manus webdev_execute_sql 工具執行以下遷移 SQL：");
      log("  - drizzle/migrations/0001_initial_schema.sql");
      log("  - drizzle/migrations/0002_ui_config_tables.sql");

      const dbReady = await askQuestion("資料庫遷移已完成？(y/n): ");
      if (dbReady.toLowerCase() !== "y") {
        logWarning("跳過資料庫初始化步驟");
      } else {
        logSuccess("資料庫初始化完成");
      }
    }

    // 步驟 6：初始化種子資料
    if (!devOnly) {
      logSection("🌱 步驟 6：初始化種子資料");
      executeCommand(
        "node seed-data.mjs",
        "種子資料初始化完成",
        { silent: true }
      );
    }

    // 步驟 7：初始化 UI 配置
    if (!devOnly) {
      logSection("🎨 步驟 7：初始化 UI 配置");
      executeCommand(
        "node init-ui-config.mjs",
        "UI 配置初始化完成",
        { silent: true }
      );
    }

    // 步驟 8：執行測試
    if (!skipTests && !dbOnly) {
      logSection("✅ 步驟 8：執行測試");
      if (!executeCommand("pnpm test", "所有測試通過")) {
        logWarning("某些測試失敗，但可以繼續啟動應用");
      }
    }

    // 步驟 9：啟動開發伺服器
    if (!dbOnly) {
      logSection("🎉 完整一鍵啟動完成！");
      logSuccess("所有初始化步驟完成");

      const startDev = await askQuestion("是否啟動開發伺服器？(y/n): ");
      if (startDev.toLowerCase() === "y") {
        logInfo("啟動開發伺服器...");
        log("\n");
        executeCommand("pnpm dev", "開發伺服器已啟動");
      } else {
        logInfo("要啟動開發伺服器，請執行：pnpm dev");
      }
    }

    logSection("✨ 設置完成！");
    log("下一步操作：", "bright");
    log("1. 在瀏覽器中打開：http://localhost:3000", "blue");
    log("2. 查看文檔：MANUS-MIGRATION-GUIDE.md", "blue");
    log("3. 根據需要自訂應用配置", "blue");
    log("\n祝您使用愉快！\n", "green");

  } catch (error) {
    logError(`\n設置失敗：${error.message}`);
    process.exit(1);
  }
}

// 執行主函數
main();
