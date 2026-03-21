import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function updateBigSmall() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  try {
    // 查詢所有開獎記錄
    const result = await db.execute(sql.raw("SELECT drawNumber, numbers, bigSmall FROM draw_records ORDER BY drawTime DESC"));
    
    let updated = 0;
    let skipped = 0;
    
    for (const record of result) {
      try {
        const numbers = JSON.parse(record.numbers);
        
        // 計算大小
        const bigCount = numbers.filter(n => n >= 51 && n <= 80).length;
        const smallCount = numbers.filter(n => n >= 1 && n <= 50).length;
        
        let newBigSmall = '－';
        if (bigCount >= 13) {
          newBigSmall = 'big';
        } else if (smallCount >= 13) {
          newBigSmall = 'small';
        }
        
        // 只更新為「－」的記錄
        if (record.bigSmall === '－') {
          await db.execute(sql.raw(`UPDATE draw_records SET bigSmall = '${newBigSmall}' WHERE drawNumber = '${record.drawNumber}'`));
          updated++;
        } else {
          skipped++;
        }
        
        if ((updated + skipped) % 50 === 0) {
          console.log(`Processed ${updated + skipped} records (Updated: ${updated}, Skipped: ${skipped})...`);
        }
      } catch (e) {
        console.error(`Error processing record ${record.drawNumber}:`, e.message);
      }
    }
    
    console.log(`Successfully updated ${updated} records, skipped ${skipped} records`);
  } catch (error) {
    console.error("Error updating bigSmall:", error);
  }
}

updateBigSmall();
