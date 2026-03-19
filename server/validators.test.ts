import { describe, it, expect } from 'vitest';
import {
  validateDraw,
  validateAiPrediction,
  validateGoogleApiResponse,
  validateDraws,
  validateAiPredictions,
} from './validators';

describe('Data Validators', () => {
  describe('validateDraw', () => {
    it('should validate correct draw data', () => {
      const validDraw = {
        period: '115015819',
        drawTime: '2026-03-19 22:00:00',
        numbers: [3, 8, 16, 18, 19, 25, 35],
      };
      const result = validateDraw(validDraw);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validDraw);
    });

    it('should reject draw with invalid numbers', () => {
      const invalidDraw = {
        period: '115015819',
        drawTime: '2026-03-19 22:00:00',
        numbers: [], // 空陣列
      };
      const result = validateDraw(invalidDraw);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject draw with missing required fields', () => {
      const invalidDraw = {
        period: '115015819',
        // 缺少 drawTime 和 numbers
      };
      const result = validateDraw(invalidDraw);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAiPrediction', () => {
    it('should validate correct AI prediction', () => {
      const validPrediction = {
        sourceHour: '14',
        targetHour: '15',
        goldenBalls: [3, 8, 16],
        isManual: 0,
        reasoning: 'Based on statistical analysis',
      };
      const result = validateAiPrediction(validPrediction);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validPrediction);
    });

    it('should reject prediction with invalid hour format', () => {
      const invalidPrediction = {
        sourceHour: '1', // 應該是 2 位數
        targetHour: '15',
        goldenBalls: [3, 8, 16],
      };
      const result = validateAiPrediction(invalidPrediction);
      expect(result.valid).toBe(false);
    });

    it('should reject prediction with empty goldenBalls', () => {
      const invalidPrediction = {
        sourceHour: '14',
        targetHour: '15',
        goldenBalls: [], // 空陣列
      };
      const result = validateAiPrediction(invalidPrediction);
      expect(result.valid).toBe(false);
    });

    it('should reject prediction with too many goldenBalls', () => {
      const invalidPrediction = {
        sourceHour: '14',
        targetHour: '15',
        goldenBalls: [1, 2, 3, 4, 5, 6, 7], // 超過 6 個
      };
      const result = validateAiPrediction(invalidPrediction);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateGoogleApiResponse', () => {
    it('should validate correct API response', () => {
      const validResponse = {
        success: true,
        data: [{ sourceHour: '14', targetHour: '15', goldenBalls: [3, 8] }],
      };
      const result = validateGoogleApiResponse(validResponse);
      expect(result.valid).toBe(true);
    });

    it('should validate error response', () => {
      const errorResponse = {
        success: false,
        error: 'API key invalid',
      };
      const result = validateGoogleApiResponse(errorResponse);
      expect(result.valid).toBe(true);
    });

    it('should reject response without success field', () => {
      const invalidResponse = {
        data: [],
      };
      const result = validateGoogleApiResponse(invalidResponse);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDraws', () => {
    it('should validate array of draws', () => {
      const validDraws = [
        {
          period: '115015819',
          drawTime: '2026-03-19 22:00:00',
          numbers: [3, 8, 16, 18, 19, 25, 35],
        },
        {
          period: '115015820',
          drawTime: '2026-03-19 23:00:00',
          numbers: [1, 2, 3, 4, 5, 6, 7],
        },
      ];
      const result = validateDraws(validDraws);
      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should reject array with invalid draw', () => {
      const invalidDraws = [
        {
          period: '115015819',
          drawTime: '2026-03-19 22:00:00',
          numbers: [3, 8, 16, 18, 19, 25, 35],
        },
        {
          period: '115015820',
          drawTime: '2026-03-19 23:00:00',
          numbers: [], // 無效
        },
      ];
      const result = validateDraws(invalidDraws);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAiPredictions', () => {
    it('should validate array of predictions', () => {
      const validPredictions = [
        {
          sourceHour: '14',
          targetHour: '15',
          goldenBalls: [3, 8, 16],
        },
        {
          sourceHour: '15',
          targetHour: '16',
          goldenBalls: [5, 10, 20],
        },
      ];
      const result = validateAiPredictions(validPredictions);
      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should reject array with invalid prediction', () => {
      const invalidPredictions = [
        {
          sourceHour: '14',
          targetHour: '15',
          goldenBalls: [3, 8, 16],
        },
        {
          sourceHour: '15',
          targetHour: '16',
          goldenBalls: [], // 無效
        },
      ];
      const result = validateAiPredictions(invalidPredictions);
      expect(result.valid).toBe(false);
    });
  });
});
