import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Generate random bingo draw
function generateDraw(drawNumber, drawTime) {
  // Pick 20 unique numbers from 1-80
  const allNums = Array.from({ length: 80 }, (_, i) => i + 1);
  const shuffled = allNums.sort(() => Math.random() - 0.5);
  const numbers = shuffled.slice(0, 20).sort((a, b) => a - b);
  
  const superNumber = shuffled[0]; // First drawn number
  const total = numbers.reduce((sum, n) => sum + n, 0);
  
  // big/small: total > 810 = big, < 810 = small, = 810 = tie
  const bigSmall = total > 810 ? 'big' : total < 810 ? 'small' : 'tie';
  
  // odd/even
  const oddEven = total % 2 === 0 ? 'even' : 'odd';
  
  // plate: count numbers in 1-40 vs 41-80
  const lower = numbers.filter(n => n <= 40).length;
  const upper = numbers.filter(n => n > 40).length;
  const plate = lower > upper ? 'upper' : lower < upper ? 'lower' : 'middle';
  
  return {
    drawNumber,
    drawTime,
    numbers: JSON.stringify(numbers),
    superNumber,
    total,
    bigSmall,
    oddEven,
    plate,
  };
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check if data already exists
  const [rows] = await connection.execute('SELECT COUNT(*) as cnt FROM draw_records');
  if (rows[0].cnt > 0) {
    console.log(`Already have ${rows[0].cnt} records, skipping seed.`);
    await connection.end();
    return;
  }
  
  const records = [];
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  
  // Generate 200 historical records (going back from now)
  for (let i = 199; i >= 0; i--) {
    const drawTime = now - (i * fiveMin);
    const date = new Date(drawTime);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const periodNum = String(Math.floor((date.getHours() * 60 + date.getMinutes()) / 5) + 1).padStart(3, '0');
    const drawNumber = `115${dateStr.slice(2)}${periodNum}`;
    
    records.push(generateDraw(drawNumber, drawTime));
  }
  
  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = batch.flatMap(r => [
      r.drawNumber, r.drawTime, r.numbers, r.superNumber,
      r.total, r.bigSmall, r.oddEven, r.plate
    ]);
    
    await connection.execute(
      `INSERT INTO draw_records (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate) VALUES ${placeholders}`,
      values
    );
  }
  
  console.log(`Seeded ${records.length} draw records.`);
  
  // Generate AI predictions for last 10 draws
  const [latestDraws] = await connection.execute(
    'SELECT drawNumber FROM draw_records ORDER BY drawTime DESC LIMIT 10'
  );
  
  for (const draw of latestDraws) {
    const nums = Array.from({ length: 80 }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .sort((a, b) => a - b);
    
    await connection.execute(
      `INSERT INTO ai_predictions (targetDrawNumber, recommendedNumbers, totalBigSmall, totalBigSmallConfidence, totalOddEven, totalOddEvenConfidence, superBigSmall, superBigSmallConfidence, superOddEven, superOddEvenConfidence, platePrediction, plateConfidence, aiSuggestion, sampleSize, overallConfidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        draw.drawNumber,
        JSON.stringify(nums),
        Math.random() > 0.5 ? 'big' : 'small',
        50 + Math.floor(Math.random() * 20),
        Math.random() > 0.5 ? 'odd' : 'even',
        50 + Math.floor(Math.random() * 20),
        Math.random() > 0.5 ? 'big' : 'small',
        50 + Math.floor(Math.random() * 20),
        Math.random() > 0.5 ? 'odd' : 'even',
        50 + Math.floor(Math.random() * 20),
        ['upper', 'lower', 'middle'][Math.floor(Math.random() * 3)],
        50 + Math.floor(Math.random() * 20),
        '根據近期大數據運算，AI 智能模型交叉比對當天與歷史樣本，綜合指標建議重點關注走勢變化。',
        50 + Math.floor(Math.random() * 150),
        50 + Math.floor(Math.random() * 20),
      ]
    );
  }
  
  console.log(`Seeded ${latestDraws.length} AI predictions.`);
  await connection.end();
}

seed().catch(console.error);
