#!/usr/bin/env node
/**
 * 同步台彩官網真實歷史數據（過去 30 天）
 * 先清除假數據，再用 taiwan-lottery-api 爬取真實數據
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/../.env` });

// 台彩 API
const API_BASE = 'https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult';

function getTaiwanDateStr(date = new Date()) {
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const taiwanDate = new Date(utcMs + taiwanOffset);
  const year = taiwanDate.getFullYear();
  const month = String(taiwanDate.getMonth() + 1).padStart(2, '0');
  const day = String(taiwanDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatToROCDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-');
  const rocYear = parseInt(year) - 1911;
  return `${rocYear}/${month}/${day} ${timeStr}:00`;
}

function calcDrawTime(index) {
  const baseMinutes = 7 * 60 + 5; // 07:05
  const totalMinutes = baseMinutes + index * 5;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const mins = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

async function fetchBingoDataFromAPI(dateStr) {
  const allResults = [];
  let pageNum = 1;
  const pageSize = 50;

  while (true) {
    const url = `${API_BASE}?openDate=${dateStr}&pageNum=${pageNum}&pageSize=${pageSize}`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.taiwanlottery.com/',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`  HTTP ${response.status} for ${dateStr} page ${pageNum}`);
        break;
      }

      const data = await response.json();
      if (data?.rtCode !== 0 || !data?.content?.bingoQueryResult) {
        break;
      }

      const results = data.content.bingoQueryResult;
      allResults.push(...results);

      if (allResults.length >= data.content.totalSize) break;
      pageNum++;
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  Failed to fetch page ${pageNum} for ${dateStr}:`, err.message);
      break;
    }
  }

  return allResults;
}

function processRawData(rawData, dateStr) {
  const sorted = [...rawData].sort((a, b) => a.drawTerm - b.drawTerm);

  return sorted.map((res, index) => {
    const drawNumber = String(res.drawTerm);
    const timeStr = calcDrawTime(index);
    const drawTime = formatToROCDateTime(dateStr, timeStr);

    const numbers = (res.bigShowOrder || []).map(Number).sort((a, b) => a - b);
    const superNumber = Number(res.bullEyeTop) || (numbers[0] ?? 0);
    const total = numbers.reduce((sum, n) => sum + n, 0);

    const bigSmall = res.highLowTop === '大' ? 'big' : res.highLowTop === '小' ? 'small' : (total > 810 ? 'big' : 'small');
    const oddEven = res.oddEvenTop === '單' ? 'odd' : res.oddEvenTop === '雙' ? 'even' : (total % 2 === 0 ? 'even' : 'odd');

    return { drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven };
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Step 1: 清除所有假數據（保留今天的真實數據）
    console.log('Step 1: 清除假測試數據...');
    const todayStr = getTaiwanDateStr();
    const [yearStr, monthStr, dayStr] = todayStr.split('-');
    const rocToday = `${parseInt(yearStr) - 1911}/${monthStr}/${dayStr}`;
    
    // 刪除所有非今天的數據（假數據）
    const [delResult] = await conn.execute(
      'DELETE FROM draw_records WHERE drawTime NOT LIKE ?',
      [rocToday + '%']
    );
    console.log(`  已刪除 ${delResult.affectedRows} 筆假數據`);

    const [remaining] = await conn.execute('SELECT COUNT(*) as cnt FROM draw_records');
    console.log(`  保留今天真實數據: ${remaining[0].cnt} 筆`);

    // Step 2: 爬取過去 30 天的真實數據
    console.log('\nStep 2: 開始爬取台彩官網真實數據（過去 30 天）...');
    
    const today = new Date();
    let totalInserted = 0;

    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getTaiwanDateStr(d);

      process.stdout.write(`  ${dateStr}: `);

      const rawData = await fetchBingoDataFromAPI(dateStr);
      if (rawData.length === 0) {
        console.log('無數據');
        continue;
      }

      const processed = processRawData(rawData, dateStr);
      
      // 批量插入
      const batchSize = 50;
      let dayInserted = 0;
      
      for (let j = 0; j < processed.length; j += batchSize) {
        const batch = processed.slice(j, j + batchSize);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const values = batch.flatMap(r => [
          r.drawNumber,
          r.drawTime,
          JSON.stringify(r.numbers),
          r.superNumber,
          r.total,
          r.bigSmall,
          r.oddEven,
          'A'
        ]);

        try {
          const sql = `INSERT INTO draw_records 
            (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate) 
            VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE
              drawTime = VALUES(drawTime),
              numbers = VALUES(numbers),
              superNumber = VALUES(superNumber),
              total = VALUES(total),
              bigSmall = VALUES(bigSmall),
              oddEven = VALUES(oddEven)`;
          
          await conn.execute(sql, values);
          dayInserted += batch.length;
        } catch (err) {
          console.error(`\n    批次插入失敗:`, err.message);
        }
      }

      totalInserted += dayInserted;
      console.log(`${dayInserted} 期 (API: ${rawData.length} 筆)`);

      // 避免被封鎖
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n✓ 總共導入 ${totalInserted} 筆真實數據`);

    // Step 3: 驗證
    console.log('\nStep 3: 驗證數據...');
    const [dates] = await conn.execute(
      'SELECT SUBSTRING(drawTime, 1, 10) as date, COUNT(*) as cnt FROM draw_records GROUP BY date ORDER BY date DESC LIMIT 35'
    );
    
    console.log('各日期數據統計:');
    dates.forEach(d => console.log(`  ${d.date}: ${d.cnt} 筆`));

    const [totalCnt] = await conn.execute('SELECT COUNT(*) as cnt FROM draw_records');
    console.log(`\n資料庫總筆數: ${totalCnt[0].cnt}`);

    // 驗證一筆數據格式
    const [sample] = await conn.execute(
      "SELECT drawNumber, drawTime, superNumber, numbers FROM draw_records WHERE drawTime LIKE '115/03/14%' ORDER BY drawTime LIMIT 1"
    );
    if (sample.length > 0) {
      console.log('\n3/14 第一筆數據範例:');
      console.log('  期號:', sample[0].drawNumber);
      console.log('  時間:', sample[0].drawTime);
      console.log('  超級獎:', sample[0].superNumber);
      const nums = typeof sample[0].numbers === 'string' ? JSON.parse(sample[0].numbers) : sample[0].numbers;
      console.log('  號碼:', nums.slice(0, 5).join(', ') + '...');
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('錯誤:', err);
  process.exit(1);
});
