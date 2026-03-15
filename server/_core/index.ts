import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getTaiwanLotteryScraper } from "../services/taiwan-lottery-scraper";
import { getMockLotteryScraper } from "../services/mock-lottery-scraper";
import { getDb } from "../db";
import { drawRecords } from "../../drizzle/schema";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // 初始化台灣彩券爬蟲並開始輪詢
  // 使用模擬爬蟲進行測試
  initializeMockLotteryScraper();
}

/**
 * 初始化模擬台灣彩券爬蟲（用於測試環境）
 */
async function initializeMockLotteryScraper() {
  try {
    const scraper = getMockLotteryScraper();
    const db = await getDb();

    if (!db) {
      console.warn('[MockScraper] Database not available, skipping scraper initialization');
      return;
    }

    console.log('[MockScraper] Starting mock lottery data sync...');

    // 啟動輪詢，每 5 分鐘生成一次新開獎
    scraper.startPolling(
      async (draw) => {
        try {
          console.log(`[MockScraper] Generated new draw: ${draw.drawNumber}`);
          
          // 驗證開獎數據
          if (!scraper.validateDraw(draw)) {
            console.warn(`[MockScraper] Invalid draw data: ${draw.drawNumber}`);
            return;
          }

          // 保存開獎數據到資料庫
          try {
            const drawData = {
              drawNumber: draw.drawNumber,
              drawTime: draw.drawTime,
              numbers: draw.numbers,
              superNumber: draw.superNumber,
              total: draw.total,
              bigSmall: draw.bigSmall,
              oddEven: draw.oddEven,
              plate: draw.plate,
            };
            
            await db.insert(drawRecords).values(drawData).onDuplicateKeyUpdate({
              set: {
                drawTime: draw.drawTime,
                numbers: draw.numbers,
                superNumber: draw.superNumber,
                total: draw.total,
                bigSmall: draw.bigSmall,
                oddEven: draw.oddEven,
                plate: draw.plate,
              },
            });
            
            console.log(`[MockScraper] Draw synced successfully: ${draw.drawNumber}`);
          } catch (dbError) {
            console.error('[MockScraper] Database error:', dbError);
          }
        } catch (error) {
          console.error('[MockScraper] Error syncing draw:', error);
        }
      },
      300 // 每 5 分鐘生成一次
    );

    console.log('[MockScraper] Mock lottery scraper initialized and polling started');
  } catch (error) {
    console.error('[MockScraper] Failed to initialize mock lottery scraper:', error);
  }
}

/**
 * 初始化台灣彩券爬蟲
 */
async function initializeLotteryScraper() {
  try {
    const scraper = getTaiwanLotteryScraper();
    const db = await getDb();

    if (!db) {
      console.warn('[Scraper] Database not available, skipping scraper initialization');
      return;
    }

    console.log('[Scraper] Starting lottery data sync...');

    // 啟動輪詢，每 30 秒檢測一次新開獎
    scraper.startPolling(
      async (draw) => {
        try {
          console.log(`[Scraper] Detected new draw: ${draw.drawNumber}`);
          
          // 驗證開獎數據
          if (!scraper.validateDraw(draw)) {
            console.warn(`[Scraper] Invalid draw data: ${draw.drawNumber}`);
            return;
          }

          // 保存開獎數據到資料庫
          try {
            const drawData = {
              drawNumber: draw.drawNumber,
              drawTime: draw.drawTime,
              numbers: draw.numbers,
              superNumber: draw.superNumber,
              total: draw.total,
              bigSmall: draw.bigSmall,
              oddEven: draw.oddEven,
              plate: draw.plate,
            };
            
            await db.insert(drawRecords).values(drawData).onDuplicateKeyUpdate({
              set: {
                drawTime: draw.drawTime,
                numbers: draw.numbers,
                superNumber: draw.superNumber,
                total: draw.total,
                bigSmall: draw.bigSmall,
                oddEven: draw.oddEven,
                plate: draw.plate,
              },
            });
            
            console.log(`[Scraper] Draw synced successfully: ${draw.drawNumber}`);
          } catch (dbError) {
            console.error('[Scraper] Database error:', dbError);
          }
        } catch (error) {
          console.error('[Scraper] Error syncing draw:', error);
        }
      },
      30 // 每 30 秒檢測一次
    );

    console.log('[Scraper] Lottery scraper initialized and polling started');
  } catch (error) {
    console.error('[Scraper] Failed to initialize lottery scraper:', error);
  }
}

startServer().catch(console.error);
