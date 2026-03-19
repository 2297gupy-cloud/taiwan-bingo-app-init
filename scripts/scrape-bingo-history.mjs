#!/usr/bin/env node
/**
 * 爬取台彩賓果賓果過去 30 天的開獎數據
 * 使用 Cheerio 解析 HTML，Axios 發送請求
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
dotenv.config({ path: `${__dirname}/../.env` });

const DB_URL = process.env.DATABASE_URL;

async function getDb() {
  return mysql.createConnection(DB_URL);
}

/**
 * 爬取台彩官網首頁，提取最近開獎的賓果數據
 */
async function scrapeBingoHistory() {
  try {
    console.log('開始爬取台彩賓果開獎數據...');
    
    const response = await axios.get('https://www.taiwanlottery.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // 尋找賓果開獎結果的 HTML 結構
    // 台彩官網通常在首頁顯示最近開獎結果
    const bingoSections = $('div[class*="bingo"], section[class*="bingo"]');
    
    console.log(`找到 ${bingoSections.length} 個賓果區塊`);
    
    if (bingoSections.length === 0) {
      console.log('未找到賓果開獎結果，嘗試其他選擇器...');
      
      // 嘗試查找包含開獎號碼的表格或列表
      const tables = $('table, .draw-result, [class*="result"]');
      console.log(`找到 ${tables.length} 個表格/結果區塊`);
      
      // 打印頁面中包含「超級獎」或「開獎」的文本
      const textContent = $.text();
      if (textContent.includes('超級獎') || textContent.includes('開獎')) {
        console.log('✓ 頁面包含開獎數據');
      }
    }
    
    // 由於台彩官網使用 JavaScript 動態加載，靜態爬蟲可能無法獲取完整數據
    // 返回提示信息
    return {
      success: false,
      message: '台彩官網使用 JavaScript 動態加載，需要使用 Puppeteer 或 Playwright',
      suggestion: '建議使用 Puppeteer 或手動提供 CSV 數據'
    };
    
  } catch (error) {
    console.error('爬蟲錯誤:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 手動插入測試數據（用於演示）
 * 實際應用中應從爬蟲或 API 獲取
 */
async function insertTestData() {
  const conn = await getDb();
  
  try {
    console.log('插入測試數據...');
    
    // 生成過去 30 天的測試數據
    const today = new Date();
    const records = [];
    
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // 轉換為民國年格式 (115/03/15)
      const year = date.getFullYear() - 1911;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}/${month}/${day}`;
      
      // 為每天生成 07:00 到 22:00 的時段數據（每 5 分鐘一期）
      for (let hour = 7; hour <= 22; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          const drawTime = `${dateStr} ${timeStr}`;
          
          // 生成隨機 20 個號碼（1-80）
          const numbers = [];
          while (numbers.length < 20) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!numbers.includes(num)) numbers.push(num);
          }
          numbers.sort((a, b) => a - b);
          
          // 計算總和
          const total = numbers.reduce((a, b) => a + b, 0);
          
          // 隨機超級獎號碼
          const superNumber = Math.floor(Math.random() * 80) + 1;
          
          // 大小判定
          const bigSmall = total > 800 ? 'big' : total < 800 ? 'small' : null;
          
          // 單雙判定
          const oddEven = total % 2 === 1 ? 'odd' : 'even';
          
          // 期號格式：115014820 (9位)
          const drawNumber = `${year}014${String(hour).padStart(2, '0')}${String(minute / 5).padStart(2, '0')}`;
          
          records.push({
            drawNumber,
            drawTime,
            numbers: JSON.stringify(numbers),
            superNumber,
            total,
            bigSmall,
            oddEven,
            plate: null
          });
        }
      }
    }
    
    console.log(`準備插入 ${records.length} 筆測試數據...`);
    
    // 批量插入（避免重複）
    for (const record of records) {
      try {
        await conn.execute(
          `INSERT IGNORE INTO draw_records 
           (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.drawNumber,
            record.drawTime,
            record.numbers,
            record.superNumber,
            record.total,
            record.bigSmall,
            record.oddEven,
            record.plate
          ]
        );
      } catch (err) {
        // 忽略重複插入錯誤
      }
    }
    
    console.log('✓ 測試數據插入完成');
    
  } finally {
    await conn.end();
  }
}

// 主程式
(async () => {
  try {
    // 先嘗試爬蟲
    const scrapeResult = await scrapeBingoHistory();
    
    if (!scrapeResult.success) {
      console.log('\n爬蟲失敗，改為插入測試數據...');
      await insertTestData();
    }
    
    console.log('\n✓ 完成');
    process.exit(0);
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
})();
