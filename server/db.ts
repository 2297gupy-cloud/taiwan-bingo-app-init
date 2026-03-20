import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, drawRecords, aiPredictions, type InsertDrawRecord } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      // 不設為 null，讓下次重試
    }
  }
  return _db || null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Draw Records ============

/** 取得最新一期開獎記錄 - 從 Google API 獲取 */
export async function getLatestDraw() {
  try {
    const { getLatestDraws } = await import('./google-api');
    const draws = await getLatestDraws(1);
    return draws.length > 0 ? draws[0] : null;
  } catch (error) {
    console.error('[getLatestDraw] Error fetching from Google API:', error);
    return null;
  }
}

/** 取得最近 N 期開獎記錄 - 從 Google API 獲取 */
export async function getRecentDraws(limit: number = 20) {
  try {
    const { getLatestDraws } = await import('./google-api');
    return await getLatestDraws(limit);
  } catch (error) {
    console.error('[getRecentDraws] Error fetching from Google API:', error);
    return [];
  }
}

/** 取得歷史開獎記錄（分頁） */
export async function getDrawHistory(page: number = 1, pageSize: number = 20) {
  const db = await getDb();
  if (!db) return { records: [], total: 0 };
  
  const offset = (page - 1) * pageSize;
  const records = await db.select().from(drawRecords)
    .orderBy(desc(drawRecords.drawTime))
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(drawRecords);
  const total = countResult[0]?.count || 0;
  
  return { records, total };
}

/** 取得統計數據 - 近 N 期 */
export async function getDrawStats(periods: number = 20) {
  const db = await getDb();
  if (!db) return null;
  
  const records = await db.select().from(drawRecords)
    .orderBy(desc(drawRecords.drawTime))
    .limit(periods);
  
  if (records.length === 0) return null;
  
  // 大小統計
  const bigCount = records.filter(r => r.bigSmall === 'big').length;
  const smallCount = records.filter(r => r.bigSmall === 'small').length;
  
  // 單雙統計
  const oddCount = records.filter(r => r.oddEven === 'odd').length;
  const evenCount = records.filter(r => r.oddEven === 'even').length;
  
  // 號碼頻率統計
  const numberFreq: Record<number, number> = {};
  for (const record of records) {
    const nums = record.numbers as number[];
    for (const n of nums) {
      numberFreq[n] = (numberFreq[n] || 0) + 1;
    }
  }
  
  // 總和走勢
  const totalTrend = records.map(r => ({
    drawNumber: r.drawNumber,
    total: r.total,
    drawTime: r.drawTime,
  })).reverse();
  
  // 盤面統計
  const upperCount = records.filter(r => r.plate === 'upper').length;
  const lowerCount = records.filter(r => r.plate === 'lower').length;
  const middleCount = records.filter(r => r.plate === 'middle').length;
  
  // 連續走勢計算
  let streak = { type: records[0].bigSmall, count: 0 };
  for (const r of records) {
    if (r.bigSmall === streak.type) {
      streak.count++;
    } else {
      break;
    }
  }

  return {
    periods: records.length,
    bigSmall: { big: bigCount, small: smallCount },
    oddEven: { odd: oddCount, even: evenCount },
    plate: { upper: upperCount, lower: lowerCount, middle: middleCount },
    numberFrequency: numberFreq,
    totalTrend,
    records,
    streak: { type: streak.type, count: streak.count },
  };
}

/** 新增開獎記錄 */
export async function insertDrawRecord(record: InsertDrawRecord) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(drawRecords).values(record);
  return record;
}

// ============ AI Predictions ============

/** 取得最新 AI 預測 */
export async function getLatestPrediction() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(aiPredictions).orderBy(desc(aiPredictions.createdAt)).limit(1);
  return result[0] || null;
}

/** 取得近期 AI 預測記錄 */
export async function getRecentPredictions(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiPredictions).orderBy(desc(aiPredictions.createdAt)).limit(limit);
}

/** 對獎 - 比對號碼 */
export async function checkNumbers(userNumbers: number[], drawNumber?: string) {
  const db = await getDb();
  if (!db) return null;
  
  let draw;
  if (drawNumber) {
    const result = await db.select().from(drawRecords).where(eq(drawRecords.drawNumber, drawNumber)).limit(1);
    draw = result[0];
  } else {
    const result = await db.select().from(drawRecords).orderBy(desc(drawRecords.drawTime)).limit(1);
    draw = result[0];
  }
  
  if (!draw) return null;
  
  const drawNums = draw.numbers as number[];
  const matched = userNumbers.filter(n => drawNums.includes(n));
  
  return {
    draw,
    userNumbers,
    matchedNumbers: matched,
    matchCount: matched.length,
    totalSelected: userNumbers.length,
  };
}
