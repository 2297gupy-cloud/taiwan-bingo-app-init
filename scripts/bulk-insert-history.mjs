#!/usr/bin/env node
/**
 * 批量導入過去 30 天的測試數據
 * 每天 204 期 (07:00~23:55，每 5 分鐘一期)
 * 期號格式：115MMDDNNN（年+月+日+當日序號）確保唯一
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
    console.log('生成過去 30 天的測試數據（每天 204 期）...');
    
    // 今天是 2026-03-15 = 民國 115/03/15
    // 過去 30 天：115/02/13 ~ 115/03/14
    const records = [];
    
    for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
      // 用 UTC+8 計算日期
      const date = new Date(2026, 2, 15); // 2026-03-15 local
      date.setDate(date.getDate() - dayOffset);
      
      const year = date.getFullYear() - 1911; // 民國年
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}/${month}/${day}`;
      
      // 每天 204 期：07:00 到 23:55
      let periodIndex = 0;
      for (let hour = 7; hour <= 23; hour++) {
        const maxMinute = (hour === 23) ? 55 : 55;
        for (let minute = 0; minute <= maxMinute; minute += 5) {
          periodIndex++;
          
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          const drawTime = `${dateStr} ${timeStr}`;
          
          // 期號格式：115MMDDNNN（確保每天唯一）
          const drawNumber = `${year}${month}${day}${String(periodIndex).padStart(3, '0')}`;
          
          // 生成隨機 20 個號碼（1-80）
          const numbers = [];
          while (numbers.length < 20) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!numbers.includes(num)) numbers.push(num);
          }
          numbers.sort((a, b) => a - b);
          
          const total = numbers.reduce((a, b) => a + b, 0);
          const superNumber = numbers[Math.floor(Math.random() * 20)]; // 從開出的號碼中選一個作為超級獎
          const bigSmall = total > 810 ? 'big' : total < 810 ? 'small' : null;
          const oddEven = total % 2 === 1 ? 'odd' : 'even';
          
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
      
      console.log(`  ${dateStr}: ${periodIndex} 期`);
    }
    
    console.log(`\n準備批量插入 ${records.length} 筆數據...`);
    
    // 分批插入（每批 200 筆）
    const batchSize = 200;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, NULL)').join(',');
      const values = batch.flatMap(r => [
        r.drawNumber,
        r.drawTime,
        r.numbers,
        r.superNumber,
        r.total,
        r.bigSmall,
        r.oddEven
      ]);
      
      const sql = `INSERT IGNORE INTO draw_records 
        (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate) 
        VALUES ${placeholders}`;
      
      try {
        await conn.execute(sql, values);
        process.stdout.write(`\r已插入: ${Math.min(i + batchSize, records.length)}/${records.length}`);
      } catch (err) {
        console.error(`\n批次 ${i}-${i+batchSize} 插入失敗:`, err.message);
      }
    }
    
    console.log('\n\n✓ 數據插入完成\n');
    
    // 驗證
    const [result] = await conn.execute(
      'SELECT SUBSTRING(drawTime, 1, 10) as date, COUNT(*) as cnt FROM draw_records GROUP BY date ORDER BY date DESC LIMIT 35'
    );
    
    console.log('各日期數據統計:');
    result.forEach(r => console.log(`  ${r.date}: ${r.cnt} 筆`));
    
    const [totalCnt] = await conn.execute('SELECT COUNT(*) as cnt FROM draw_records');
    console.log(`\n資料庫總筆數: ${totalCnt[0].cnt}`);
    
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
