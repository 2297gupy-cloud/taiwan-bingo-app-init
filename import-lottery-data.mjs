import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 動態導入 drizzle 和數據庫模組
const { getDb } = await import('./server/db.ts');
const { drawRecords } = await import('./drizzle/schema.ts');

// 讀取導入數據
const importData = JSON.parse(fs.readFileSync('/tmp/import_data.json', 'utf-8'));

console.log(`開始導入 ${importData.length} 筆開獎記錄...`);

try {
  const database = await getDb();
  if (!database) {
    throw new Error('無法連接數據庫');
  }

  // 批量插入數據
  let inserted = 0;
  let skipped = 0;
  
  for (const record of importData) {
    try {
      // 檢查是否已存在
      const existing = await database
        .select()
        .from(drawRecords)
        .where(eq(drawRecords.drawNumber, record.drawNumber));
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // 插入新記錄
      await database.insert(drawRecords).values({
        drawNumber: record.drawNumber,
        drawTime: record.drawTime,
        numbers: JSON.stringify(record.numbers),
        superNumber: record.superNumber,
        bigSmall: record.bigSmall,
        oddEven: record.oddEven,
        createdAt: new Date(),
      });
      
      inserted++;
      
      if (inserted % 100 === 0) {
        console.log(`已插入 ${inserted} 筆...`);
      }
    } catch (err) {
      console.error(`插入失敗 (${record.drawNumber}):`, err.message);
    }
  }
  
  console.log(`\n導入完成！`);
  console.log(`新增: ${inserted} 筆`);
  console.log(`跳過: ${skipped} 筆（已存在）`);
  
  process.exit(0);
} catch (err) {
  console.error('導入失敗:', err);
  process.exit(1);
}
