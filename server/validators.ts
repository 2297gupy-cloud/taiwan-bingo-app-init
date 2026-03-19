/**
 * 數據驗證層
 * 確保從 Google API 返回的數據格式正確無誤
 */

import { z } from 'zod';

/**
 * 開獎數據驗證 Schema
 */
export const DrawSchema = z.object({
  period: z.string().or(z.number()),
  drawTime: z.string(),
  numbers: z.array(z.number()).min(1).max(7),
  specialNumber: z.number().optional(),
  date: z.string().optional(),
}).strict();

export type Draw = z.infer<typeof DrawSchema>;

/**
 * AI 預測數據驗證 Schema
 */
export const AiPredictionSchema = z.object({
  sourceHour: z.string().regex(/^\d{2}$/),
  targetHour: z.string().regex(/^\d{2}$/),
  goldenBalls: z.array(z.number().min(1).max(80)).min(1).max(6),
  isManual: z.number().or(z.boolean()).optional(),
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  timestamp: z.number().optional(),
}).strict();

export type AiPrediction = z.infer<typeof AiPredictionSchema>;

/**
 * Google API 響應驗證 Schema
 */
export const GoogleApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
}).strict();

export type GoogleApiResponse = z.infer<typeof GoogleApiResponseSchema>;

/**
 * 驗證開獎數據
 */
export function validateDraw(data: unknown): { valid: boolean; data?: Draw; error?: string } {
  try {
    const validated = DrawSchema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error) };
    }
    return { valid: false, error: String(error) };
  }
}

/**
 * 驗證 AI 預測數據
 */
export function validateAiPrediction(data: unknown): { valid: boolean; data?: AiPrediction; error?: string } {
  try {
    const validated = AiPredictionSchema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error) };
    }
    return { valid: false, error: String(error) };
  }
}

/**
 * 驗證 Google API 響應
 */
export function validateGoogleApiResponse(data: unknown): { valid: boolean; data?: GoogleApiResponse; error?: string } {
  try {
    const validated = GoogleApiResponseSchema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error) };
    }
    return { valid: false, error: String(error) };
  }
}

/**
 * 驗證開獎數據陣列
 */
export function validateDraws(data: unknown): { valid: boolean; data?: Draw[]; error?: string } {
  try {
    const validated = z.array(DrawSchema).parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error) };
    }
    return { valid: false, error: String(error) };
  }
}

/**
 * 驗證 AI 預測數據陣列
 */
export function validateAiPredictions(data: unknown): { valid: boolean; data?: AiPrediction[]; error?: string } {
  try {
    const validated = z.array(AiPredictionSchema).parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error) };
    }
    return { valid: false, error: String(error) };
  }
}

/**
 * 安全地驗證和轉換數據
 */
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(error);
      console.error('Validation error:', errorMessages);
      return { success: false, error: errorMessages };
    }
    console.error('Unexpected validation error:', error);
    return { success: false, error: String(error) };
  }
}
