#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 讀取環境變量
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taiwan_bingo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function importData() {
  try {
    // 讀取 JSON 數據
    const importData = JSON.parse(fs.readFileSync('/tmp/import_data.json', 'utf-8'));
    console.log(`準備導入 ${importData.length} 筆記錄...`);
    
    // 創建連接池
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    
    let inserted = 0;
    let skipped = 0;
    const batchSize = 100;
    
    // 分批導入
    for (let i = 0; i < importData.length; i += batchSize) {
      const batch = importData.slice(i, Math.min(i + batchSize, importData.length));
      const values = batch.map(record => [
        record.drawNumber,
        record.drawTime,
        JSON.stringify(record.numbers),
        record.superNumber,
        record.bigSmall,
        record.oddEven,
        new Date(),
      ]);
      
      try {
        const [result] = await connection.query(
          'INSERT IGNORE INTO draw_records (drawNumber, drawTime, numbers, superNumber, bigSmall, oddEven, createdAt) VALUES ?',
          [values]
        );
        inserted += result.affectedRows;
        
        if ((i + batchSize) % 500 === 0 || i + batchSize >= importData.length) {
          console.log(`進度: ${Math.min(i + batchSize, importData.length)}/${importData.length} (已插入: ${inserted})`);
        }
      } catch (err) {
        console.error(`批次 ${i}-${i + batchSize} 導入失敗:`, err.message);
      }
    }
    
    console.log(`\n導入完成！`);
    console.log(`新增: ${inserted} 筆`);
    
    connection.release();
    await pool.end();
    
  } catch (err) {
    console.error('導入失敗:', err);
    process.exit(1);
  }
}

importData();
