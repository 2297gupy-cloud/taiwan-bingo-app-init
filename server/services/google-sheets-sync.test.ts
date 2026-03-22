import { describe, it, expect } from 'vitest';
import {
  processGoogleSheetsData,
} from './google-sheets-sync';

describe('Google Sheets Sync Service', () => {
  describe('processGoogleSheetsData', () => {
    it('should convert Google Sheets data to application format', () => {
      // 新格式：date 是 YYYY-MM-DD（不帶時區），來自 Google Apps Script ?action=date
      const input = [
        {
          period: '115016038',
          date: '2026-03-21',
          time: '07:05',
          numbers: ['04', '13', '15', '18', '20', '21', '27', '30', '38', '42', '49', '50', '56', '58', '65', '67', '70', '71', '77', '80'],
          superNum: '超級獎49',
          size: '－',
          oe: '－',
        },
        {
          period: '115016044',
          date: '2026-03-21',
          time: '07:35',
          numbers: ['16', '18', '28', '31', '33', '36', '39', '41', '45', '47', '49', '54', '57', '59', '63', '64', '65', '73', '74', '76'],
          superNum: '超級獎39',
          size: '大',
          oe: '－',
        },
      ];

      const result = processGoogleSheetsData(input);

      expect(result).toHaveLength(2);
      
      // 第一筆記錄：日期應為 115/03/21（直接解析 YYYY-MM-DD，不受時區影響）
      expect(result[0]).toEqual({
        drawNumber: '115016038',
        drawTime: '115/03/21 07:05:00',
        numbers: [4, 13, 15, 18, 20, 21, 27, 30, 38, 42, 49, 50, 56, 58, 65, 67, 70, 71, 77, 80],
        superNumber: 49,
        bigSmall: '－',
        oddEven: '－',
      });

      // 第二筆記錄
      expect(result[1]).toEqual({
        drawNumber: '115016044',
        drawTime: '115/03/21 07:35:00',
        numbers: [16, 18, 28, 31, 33, 36, 39, 41, 45, 47, 49, 54, 57, 59, 63, 64, 65, 73, 74, 76],
        superNumber: 39,
        bigSmall: 'big',
        oddEven: '－',
      });
    });

    it('should handle different size and oe values', () => {
      const input = [
        {
          period: '115016048',
          date: '2026-03-21',
          time: '07:55',
          numbers: ['05', '06', '07', '10', '14', '15', '18', '21', '22', '26', '30', '33', '34', '39', '40', '48', '62', '63', '69', '80'],
          superNum: '超級獎62',
          size: '小',
          oe: '－',
        },
        {
          period: '115016050',
          date: '2026-03-21',
          time: '08:05',
          numbers: ['09', '11', '21', '27', '29', '34', '35', '39', '40', '41', '43', '46', '47', '51', '52', '57', '61', '66', '70', '75'],
          superNum: '超級獎41',
          size: '－',
          oe: '單',
        },
      ];

      const result = processGoogleSheetsData(input);

      expect(result[0].bigSmall).toBe('small');
      expect(result[0].oddEven).toBe('－');
      
      expect(result[1].bigSmall).toBe('－');
      expect(result[1].oddEven).toBe('odd');
    });

    it('should handle even and double values', () => {
      const input = [
        {
          period: '115016001',
          date: '2026-03-21',
          time: '07:05',
          numbers: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
          superNum: '超級獎01',
          size: '大',
          oe: '雙',
        },
      ];

      const result = processGoogleSheetsData(input);

      expect(result[0].bigSmall).toBe('big');
      expect(result[0].oddEven).toBe('even');
    });

    it('should correctly convert ROC year for 2026-03-22 without timezone issues', () => {
      const input = [{
        period: '115016441',
        date: '2026-03-22',
        time: '07:05',
        numbers: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
        superNum: '超級獎05',
        size: '－',
        oe: '－',
      }];
      const result = processGoogleSheetsData(input);
      // 關鍵：日期應為 22，不受時區影響變成 21
      expect(result[0].drawTime).toBe('115/03/22 07:05:00');
    });

    it('should handle empty array', () => {
      const result = processGoogleSheetsData([]);
      expect(result).toHaveLength(0);
    });
  });
});
