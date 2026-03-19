import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bingo',
  uri: process.env.DATABASE_URL,
});

async function seedData() {
  try {
    console.log('開始添加種子數據...');

    // 1. 添加開獎記錄
    console.log('添加開獎記錄...');
    const drawRecords = [
      {
        drawNumber: '113000001',
        drawTime: new Date('2026-03-14'),
        numbers: [5, 12, 28, 35, 42, 58, 65, 72, 3, 19, 31, 48, 54, 61, 73, 8, 22, 39, 51, 67],
        superNumber: 7,
        total: 280,
        bigSmall: 'big',
        oddEven: 'even',
        plate: 'A',
      },
      {
        drawNumber: '113000002',
        drawTime: new Date('2026-03-13'),
        numbers: [1, 15, 26, 33, 44, 56, 62, 71, 9, 18, 29, 41, 53, 64, 74, 6, 24, 37, 49, 68],
        superNumber: 4,
        total: 295,
        bigSmall: 'big',
        oddEven: 'odd',
        plate: 'B',
      },
      {
        drawNumber: '113000003',
        drawTime: new Date('2026-03-12'),
        numbers: [11, 20, 32, 45, 57, 63, 70, 2, 14, 27, 38, 50, 60, 69, 75, 7, 21, 36, 47, 59],
        superNumber: 10,
        total: 310,
        bigSmall: 'small',
        oddEven: 'even',
        plate: 'C',
      },
    ];

    for (const record of drawRecords) {
      await connection.execute(
        `INSERT INTO draw_records (drawNumber, drawTime, numbers, superNumber, total, bigSmall, oddEven, plate, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          record.drawNumber,
          record.drawTime,
          JSON.stringify(record.numbers),
          record.superNumber,
          record.total,
          record.bigSmall,
          record.oddEven,
          record.plate,
        ]
      );
    }
    console.log('✓ 添加了 3 條開獎記錄');

    // 2. 添加賓果遊戲房間
    console.log('添加賓果遊戲房間...');
    const rooms = [
      {
        name: '新手練習房',
        description: '適合新手練習的遊戲房間',
        maxPlayers: 10,
        creatorId: 1,
        status: 'waiting',
      },
      {
        name: '高手挑戰房',
        description: '高手玩家的競技房間',
        maxPlayers: 20,
        creatorId: 1,
        status: 'playing',
      },
      {
        name: '輕鬆娛樂房',
        description: '輕鬆娛樂，沒有壓力',
        maxPlayers: 15,
        creatorId: 1,
        status: 'waiting',
      },
    ];

    let roomIds = [];
    for (const room of rooms) {
      const [result] = await connection.execute(
        `INSERT INTO bingo_rooms (name, description, maxPlayers, creatorId, status, currentPlayers, createdAt) 
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [room.name, room.description, room.maxPlayers, room.creatorId, room.status]
      );
      roomIds.push(result.insertId);
    }
    console.log(`✓ 添加了 ${roomIds.length} 個遊戲房間`);

    // 3. 添加遊戲局
    console.log('添加遊戲局...');
    const games = [
      {
        roomId: roomIds[0],
        status: 'finished',
        drawnNumbers: [5, 12, 28, 35, 42, 58, 65, 72, 3, 19],
        winners: [1, 2],
      },
      {
        roomId: roomIds[1],
        status: 'playing',
        drawnNumbers: [1, 15, 26, 33, 44, 56, 62, 71, 9, 18, 29, 41],
        winners: [],
      },
    ];

    let gameIds = [];
    for (const game of games) {
      const [result] = await connection.execute(
        `INSERT INTO bingo_games (roomId, status, drawnNumbers, winners, createdAt) 
         VALUES (?, ?, ?, ?, NOW())`,
        [game.roomId, game.status, JSON.stringify(game.drawnNumbers), JSON.stringify(game.winners)]
      );
      gameIds.push(result.insertId);
    }
    console.log(`✓ 添加了 ${gameIds.length} 個遊戲局`);

    // 4. 添加賓果卡
    console.log('添加賓果卡...');
    function generateBingoCard() {
      const numbers = [];
      const used = new Set();
      while (numbers.length < 25) {
        const num = Math.floor(Math.random() * 75) + 1;
        if (!used.has(num)) {
          numbers.push(num);
          used.add(num);
        }
      }
      return numbers;
    }

    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i];
      for (let playerId = 1; playerId <= 3; playerId++) {
        const cardNumbers = generateBingoCard();
        const markedNumbers = cardNumbers.slice(0, 5); // 標記前 5 個號碼
        const isBingo = i === 0 && playerId <= 2 ? 1 : 0; // 第一個遊戲的前兩個玩家已賓果

        await connection.execute(
          `INSERT INTO bingo_cards (gameId, playerId, numbers, markedNumbers, isBingo, createdAt) 
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [gameId, playerId, JSON.stringify(cardNumbers), JSON.stringify(markedNumbers), isBingo]
        );
      }
    }
    console.log('✓ 添加了賓果卡');

    // 5. 添加遊戲參與者
    console.log('添加遊戲參與者...');
    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i];
      for (let playerId = 1; playerId <= 3; playerId++) {
        const status = i === 0 && playerId <= 2 ? 'bingo' : 'joined';
        await connection.execute(
          `INSERT INTO game_participants (gameId, playerId, status, createdAt) 
           VALUES (?, ?, ?, NOW())`,
          [gameId, playerId, status]
        );
      }
    }
    console.log('✓ 添加了遊戲參與者');

    // 6. 添加玩家統計
    console.log('添加玩家統計...');
    const stats = [
      { playerId: 1, totalGames: 5, bingoCount: 2, winRate: 40, bestScore: 15, averageDraws: 35 },
      { playerId: 2, totalGames: 4, bingoCount: 1, winRate: 25, bestScore: 18, averageDraws: 38 },
      { playerId: 3, totalGames: 3, bingoCount: 0, winRate: 0, bestScore: 0, averageDraws: 42 },
    ];

    for (const stat of stats) {
      await connection.execute(
        `INSERT INTO player_stats (playerId, totalGames, bingoCount, winRate, bestScore, averageDraws, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [stat.playerId, stat.totalGames, stat.bingoCount, stat.winRate, stat.bestScore, stat.averageDraws]
      );
    }
    console.log('✓ 添加了玩家統計');

    console.log('\n✅ 種子數據添加完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加種子數據失敗:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedData();
