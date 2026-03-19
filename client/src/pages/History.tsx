import { useState } from 'react';
import { trpc } from '../lib/trpc';

export function History() {
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const { data: draws, isLoading } = (trpc.draw.byDate as any).useQuery({ dateStr });

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-4">歷史號碼</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">選擇日期</label>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="px-4 py-2 border border-border rounded bg-background"
        />
      </div>

      {isLoading ? (
        <div>載入中...</div>
      ) : draws?.data && draws.data.length > 0 ? (
        <div className="space-y-3">
          {draws.data.map((draw: any) => (
            <div key={draw.period} className="p-4 bg-card rounded border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">期別: {draw.period}</span>
                <span className="text-sm text-muted-foreground">{draw.time}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(draw.numbers) ? (
                  draw.numbers.map((num: any, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                      {num}
                    </span>
                  ))
                ) : (
                  <span>{draw.numbers}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground">該日期無開獎數據</div>
      )}
    </div>
  );
}
