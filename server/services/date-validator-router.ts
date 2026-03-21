/**
 * 日期驗證 tRPC 路由
 * 提供手動觸發日期驗證的接口
 */

import { protectedProcedure, router } from '../_core/trpc';
import { runManualDateValidation } from './daily-date-validator-scheduler';

export const dateValidatorRouter = router({
  /**
   * 手動執行日期驗證
   */
  validateNow: protectedProcedure.mutation(async () => {
    const result = await runManualDateValidation();
    return result;
  }),
});
