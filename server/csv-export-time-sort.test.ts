import { describe, it, expect } from 'vitest';

/**
 * CSV 時間排序測試
 * 驗證：同一天內的記錄按時間由大到小排序（晚的在前，早的在後）
 */

interface DrawRecord {
  drawNumber: number;
  drawTime: string;
  numbers: number[];
  superNumber: number;
  bigSmall: 'big' | 'small';
  oddEven: 'odd' | 'even';
}

function generateCSVWithTimeSorting(records: DrawRecord[]): string {
  // 按日期分組
  const groupedByDate = new Map<string, DrawRecord[]>();
  records.forEach(r => {
    const rawTime = r.drawTime || '';
    const dateMatch = rawTime.match(/^-?\d+\/(\d{2})\/(\d{2})/);
    const dateKey = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}` : 'unknown';
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(r);
  });

  const sortedDates = Array.from(groupedByDate.keys()).sort().reverse();
  const header = '期數,開獎時間,號碼,超級獎號,大小,單雙';
  const csvLines: string[] = [];

  sortedDates.forEach(dateKey => {
    const dayRecords = groupedByDate.get(dateKey) || [];
    // 同一天內按時間由大到小排序（晚的在前，早的在後）
    dayRecords.sort((a, b) => {
      const timeA = a.drawTime || '';
      const timeB = b.drawTime || '';
      return timeB.localeCompare(timeA);
    });

    csvLines.push(`# ${dateKey}`);
    csvLines.push(header);

    dayRecords.forEach(r => {
      const rawTime = r.drawTime || '';
      const timeDisplay = rawTime.startsWith('-')
        ? rawTime.replace(/^-\d+/, (m) => {
            const rocYear = Math.abs(parseInt(m));
            return String(rocYear + 1911);
          })
        : rawTime;

      const nums = Array.isArray(r.numbers) ? (r.numbers as number[]).sort((a, b) => a - b).join('|') : '';
      csvLines.push([
        r.drawNumber,
        timeDisplay,
        nums,
        r.superNumber,
        r.bigSmall === 'big' ? '大' : r.bigSmall === 'small' ? '小' : r.bigSmall,
        r.oddEven === 'odd' ? '單' : r.oddEven === 'even' ? '雙' : r.oddEven,
      ].join(','));
    });
    csvLines.push('');
  });

  return csvLines.join('\n');
}

describe('CSV 時間排序', () => {
  it('應該按時間由大到小排序（同一天內）', () => {
    const records: DrawRecord[] = [
      {
        drawNumber: 1,
        drawTime: '115/03/15 08:10:00',
        numbers: [1, 5],
        superNumber: 5,
        bigSmall: 'big',
        oddEven: 'odd',
      },
      {
        drawNumber: 2,
        drawTime: '115/03/15 16:10:00',
        numbers: [2, 6],
        superNumber: 3,
        bigSmall: 'small',
        oddEven: 'even',
      },
      {
        drawNumber: 3,
        drawTime: '115/03/15 12:10:00',
        numbers: [3, 7],
        superNumber: 7,
        bigSmall: 'big',
        oddEven: 'odd',
      },
    ];

    const csv = generateCSVWithTimeSorting(records);
    const lines = csv.split('\n');

    // 找到數據行（不是標題或分隔符）
    const dataLines = lines.filter(line => line.match(/^\d+,/));

    // 驗證順序：16:10 > 12:10 > 08:10
    expect(dataLines[0]).toContain('115/03/15 16:10:00');
    expect(dataLines[1]).toContain('115/03/15 12:10:00');
    expect(dataLines[2]).toContain('115/03/15 08:10:00');
  });

  it('應該在多個日期時分別排序', () => {
    const records: DrawRecord[] = [
      {
        drawNumber: 1,
        drawTime: '115/03/14 08:10:00',
        numbers: [1],
        superNumber: 5,
        bigSmall: 'big',
        oddEven: 'odd',
      },
      {
        drawNumber: 2,
        drawTime: '115/03/15 16:10:00',
        numbers: [2],
        superNumber: 3,
        bigSmall: 'small',
        oddEven: 'even',
      },
      {
        drawNumber: 3,
        drawTime: '115/03/15 08:10:00',
        numbers: [3],
        superNumber: 7,
        bigSmall: 'big',
        oddEven: 'odd',
      },
      {
        drawNumber: 4,
        drawTime: '115/03/14 16:10:00',
        numbers: [4],
        superNumber: 2,
        bigSmall: 'small',
        oddEven: 'even',
      },
    ];

    const csv = generateCSVWithTimeSorting(records);
    const lines = csv.split('\n');

    // 03/15 應該在前（日期由新到舊）
    const idx03_15 = lines.findIndex(line => line === '# 03/15');
    const idx03_14 = lines.findIndex(line => line === '# 03/14');
    expect(idx03_15).toBeLessThan(idx03_14);

    // 03/15 內部：16:10 在 08:10 前
    const csv03_15Section = csv.substring(csv.indexOf('# 03/15'), csv.indexOf('# 03/14'));
    const dataLines03_15 = csv03_15Section.split('\n').filter(line => line.match(/^\d+,/));
    expect(dataLines03_15[0]).toContain('16:10:00');
    expect(dataLines03_15[1]).toContain('08:10:00');

    // 03/14 內部：16:10 在 08:10 前
    const csv03_14Section = csv.substring(csv.indexOf('# 03/14'));
    const dataLines03_14 = csv03_14Section.split('\n').filter(line => line.match(/^\d+,/));
    expect(dataLines03_14[0]).toContain('16:10:00');
    expect(dataLines03_14[1]).toContain('08:10:00');
  });

  it('應該正確處理相同時間的記錄', () => {
    const records: DrawRecord[] = [
      {
        drawNumber: 1,
        drawTime: '115/03/15 08:10:00',
        numbers: [1],
        superNumber: 5,
        bigSmall: 'big',
        oddEven: 'odd',
      },
      {
        drawNumber: 2,
        drawTime: '115/03/15 08:10:00',
        numbers: [2],
        superNumber: 3,
        bigSmall: 'small',
        oddEven: 'even',
      },
    ];

    const csv = generateCSVWithTimeSorting(records);
    const lines = csv.split('\n');
    const dataLines = lines.filter(line => line.match(/^\d+,/));

    // 相同時間應該保持原順序或穩定排序
    expect(dataLines).toHaveLength(2);
    expect(dataLines[0]).toContain('08:10:00');
    expect(dataLines[1]).toContain('08:10:00');
  });

  it('應該使用 localeCompare 進行字串比較', () => {
    const records: DrawRecord[] = [
      {
        drawNumber: 1,
        drawTime: '115/03/15 09:05:00',
        numbers: [1],
        superNumber: 5,
        bigSmall: 'big',
        oddEven: 'odd',
      },
      {
        drawNumber: 2,
        drawTime: '115/03/15 09:55:00',
        numbers: [2],
        superNumber: 3,
        bigSmall: 'small',
        oddEven: 'even',
      },
      {
        drawNumber: 3,
        drawTime: '115/03/15 09:10:00',
        numbers: [3],
        superNumber: 7,
        bigSmall: 'big',
        oddEven: 'odd',
      },
    ];

    const csv = generateCSVWithTimeSorting(records);
    const lines = csv.split('\n');
    const dataLines = lines.filter(line => line.match(/^\d+,/));

    // 驗證順序：09:55 > 09:10 > 09:05
    expect(dataLines[0]).toContain('09:55:00');
    expect(dataLines[1]).toContain('09:10:00');
    expect(dataLines[2]).toContain('09:05:00');
  });
});
