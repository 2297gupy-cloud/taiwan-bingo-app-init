import { describe, it, expect, beforeEach } from "vitest";
import {
  generateBingoCardNumbers,
  checkBingo,
} from "./bingo-db";

describe("Bingo Game Logic", () => {
  describe("generateBingoCardNumbers", () => {
    it("should generate 25 unique numbers between 1 and 75", () => {
      const numbers = generateBingoCardNumbers();
      expect(numbers).toHaveLength(25);
      expect(new Set(numbers).size).toBe(25);
      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(75);
      });
    });

    it("should generate different cards on multiple calls", () => {
      const card1 = generateBingoCardNumbers();
      const card2 = generateBingoCardNumbers();
      expect(card1).not.toEqual(card2);
    });
  });

  describe("checkBingo", () => {
    let cardNumbers: number[];

    beforeEach(() => {
      // 創建一個測試用的賓果卡
      // 5x5 格子，號碼為 1-25
      cardNumbers = [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 10,
        11, 12, 13, 14, 15,
        16, 17, 18, 19, 20,
        21, 22, 23, 24, 25,
      ];
    });

    it("should return false when no numbers are marked", () => {
      const markedNumbers: number[] = [];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should detect horizontal bingo (first row)", () => {
      const markedNumbers = [1, 2, 3, 4, 5];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect horizontal bingo (middle row)", () => {
      const markedNumbers = [11, 12, 13, 14, 15];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect horizontal bingo (last row)", () => {
      const markedNumbers = [21, 22, 23, 24, 25];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect vertical bingo (first column)", () => {
      const markedNumbers = [1, 6, 11, 16, 21];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect vertical bingo (middle column)", () => {
      const markedNumbers = [3, 8, 13, 18, 23];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect vertical bingo (last column)", () => {
      const markedNumbers = [5, 10, 15, 20, 25];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect diagonal bingo (top-left to bottom-right)", () => {
      const markedNumbers = [1, 7, 13, 19, 25];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should detect diagonal bingo (top-right to bottom-left)", () => {
      const markedNumbers = [5, 9, 13, 17, 21];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should return false for incomplete row", () => {
      const markedNumbers = [1, 2, 3, 4]; // 缺少 5
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should return false for incomplete column", () => {
      const markedNumbers = [1, 6, 11, 16]; // 缺少 21
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should return false for incomplete diagonal", () => {
      const markedNumbers = [1, 7, 13, 19]; // 缺少 25
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should handle marked numbers in any order", () => {
      const markedNumbers = [5, 1, 3, 4, 2]; // 亂序
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });

    it("should return false when marked numbers are not in card", () => {
      const markedNumbers = [100, 101, 102, 103, 104];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty card numbers", () => {
      const cardNumbers: number[] = [];
      const markedNumbers: number[] = [];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should handle single marked number", () => {
      const cardNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
      const markedNumbers = [1];
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(false);
    });

    it("should handle all numbers marked", () => {
      const cardNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
      const markedNumbers = cardNumbers;
      expect(checkBingo(cardNumbers, markedNumbers)).toBe(true);
    });
  });
});
