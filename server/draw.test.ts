import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("draw.latest", () => {
  it("returns the latest draw record or null", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.draw.latest();
    if (result) {
      expect(result).toHaveProperty("drawNumber");
      expect(result).toHaveProperty("numbers");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("bigSmall");
      expect(result).toHaveProperty("oddEven");
      expect(result).toHaveProperty("superNumber");
      expect(result).toHaveProperty("plate");
      expect(typeof result.total).toBe("number");
      expect(Array.isArray(result.numbers)).toBe(true);
      expect((result.numbers as number[]).length).toBe(20);
    }
  });
});

describe("draw.recent", () => {
  it("returns an array of recent draws", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.draw.recent({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result[0]).toHaveProperty("drawNumber");
    }
  });
});

describe("draw.history", () => {
  it("returns paginated history with total count", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.draw.history({ page: 1, pageSize: 10 });
    expect(result).toHaveProperty("records");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});

describe("stats.summary", () => {
  it("returns statistical summary data with streak info", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.stats.summary({ periods: 20 });
    if (result) {
      expect(result).toHaveProperty("bigSmall");
      expect(result).toHaveProperty("oddEven");
      expect(result).toHaveProperty("numberFrequency");
      expect(result).toHaveProperty("totalTrend");
      expect(result).toHaveProperty("streak");
      expect(result.bigSmall).toHaveProperty("big");
      expect(result.bigSmall).toHaveProperty("small");
      expect(result.oddEven).toHaveProperty("odd");
      expect(result.oddEven).toHaveProperty("even");
      // Streak should have type and count
      expect(result.streak).toHaveProperty("type");
      expect(result.streak).toHaveProperty("count");
      expect(result.streak.count).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("prediction.latest", () => {
  it("returns the latest AI prediction or null", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.prediction.latest();
    if (result) {
      expect(result).toHaveProperty("targetDrawNumber");
      expect(result).toHaveProperty("recommendedNumbers");
      expect(result).toHaveProperty("overallConfidence");
      expect(result).toHaveProperty("sampleSize");
      expect(result).toHaveProperty("totalBigSmall");
      expect(result).toHaveProperty("totalOddEven");
      expect(result).toHaveProperty("superBigSmall");
      expect(result).toHaveProperty("superOddEven");
      expect(result).toHaveProperty("platePrediction");
      expect(Array.isArray(result.recommendedNumbers)).toBe(true);
    }
  });
});

describe("prediction.recent", () => {
  it("returns an array of recent predictions", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.prediction.recent({ limit: 3 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("checker.check", () => {
  it("returns match results for given numbers", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checker.check({ numbers: [1, 5, 10, 20, 30] });
    if (result) {
      expect(result).toHaveProperty("draw");
      expect(result).toHaveProperty("matchedNumbers");
      expect(result).toHaveProperty("matchCount");
      expect(result).toHaveProperty("totalSelected");
      expect(result.totalSelected).toBe(5);
      expect(Array.isArray(result.matchedNumbers)).toBe(true);
      expect(typeof result.matchCount).toBe("number");
    }
  });
});
