#!/usr/bin/env node
/**
 * 批量導入過去 30 天的測試數據
 * 使用單一 INSERT 語句快速導入
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/../.env` });

async function generateAndInsertData() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('生成過去 30 天的測試數據...');
    
    const today = new Date();
    const records = [];
    
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // 民國年 = 西元年 - 1911
      const year = date.getFullYear() - 1911;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}/${month}/${day}`;
      
      console.log(`生成 ${dateStr} 的數據...`);
      
      // 每天 07:00 到 23:00，每 5 分鐘一期 = 204 期
      for (let hour = 7; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          const drawTime = `${dateStr} ${timeStr}`;
          
          // 生成隨機 20 個號碼
          const numbers = [];
          while (numbers.length < 20) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!numbers.includes(num)) numbers.push(num);
          }
          numbers.sort((a, b) => a - b);
          
          const total = numbers.reduce((a, b) => a + b, 0);
          const superNumber = Math.floor(Math.random() * 80) + 1;
          const bigSmall = total > 800 ? 'big' : total < 800 ? 'small' : null;
          const oddEven = total % 2 === 1 ? 'odd' : 'even';
          
          // 期號：115014820 (年年期期時時分分)
          const drawNumber = `${year}014${String(hour).padStart(2, '0')}${String(minute / 5).padStart(2, '0')}`;
          
          records.push({
            drawNumber,
            drawTime,
            numbers: JSON.stringify(numbers),
            superNumber,
            total,
            bigSmall,
            oddEven
          });
        }
      }
    }
    
    console.log(`\n準備批量插入 ${records.length} 筆數據...`);
    
    // 分批插入（每批 100 筆）
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const values = batch.map(r => 
        `('${r.drawNumber}', '${r.drawTime}', '${r.numbers.replace(/'/g, "\\'")}', ${r.superNumber}, ${r.total}, '${r.bigSmall}', '${r.oddEven}', NULL)`
      ).join(',');
      
      const sql = `INSERT IGNORE INTO draw_records 
        (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate) 
        VALUES ${values}`;
      
      try {
        await conn.execute(sql);
        process.stdout.write(`\r已插入: ${Math.min(i + batchSize, records.length)}/${records.length}`);
      } catch (err) {
        console.error(`\n批次 ${i}-${i+batchSize} 插入失敗:`, err.message);
      }
    }
    
    console.log('\n✓ 數據插入完成\n');
    
    // 驗證
    const [result] = await conn.execute(
      'SELECT SUBSTRING(drawTime, 1, 10) as date, COUNT(*) as cnt FROM draw_records GROUP BY date ORDER BY date DESC LIMIT 10'
    );
    
    console.log('最近 10 天的數據統計:');
    result.forEach(r => console.log(`  ${r.date}: ${r.cnt} 筆`));
    
  } finally {
    await conn.end();
  }
}

(async () => {
  try {
    await generateAndInsertData();
    process.exit(0);
  } catch (error) {
    console.error('錯誤:', error);
    process.exit(1);
  }
})();
