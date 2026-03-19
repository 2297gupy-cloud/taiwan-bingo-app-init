import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';

export function Live() {
  const [latestPeriod, setLatestPeriod] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await (trpc.draw.checkLatest as any).query();
        if (result.success && result.data.latestPeriod > latestPeriod) {
          setLatestPeriod(result.data.latestPeriod);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [latestPeriod]);

  const { data: draws, isLoading } = (trpc.draw.latest as any).useQuery({ n: 10 });

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-3xl font-bold mb-4">即時開獎</h1>
      <div className="text-lg text-muted-foreground mb-6">最新期別: {latestPeriod || '載入中...'}</div>

      {isLoading ? (
        <div>載入中...</div>
      ) : draws?.data ? (
        <div className="space-y-4">
          {draws.data.map((draw: any) => (
            <div key={draw.period} className="p-4 bg-card rounded border border-border">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg">期別: {draw.period}</span>
                <span className="text-sm text-muted-foreground">{draw.date} {draw.time}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Array.isArray(draw.numbers) ? (
                  draw.numbers.map((num: any, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-primary text-primary-foreground rounded">
                      {num}
                    </span>
                  ))
                ) : (
                  <span>{draw.numbers}</span>
                )}
              </div>
              {draw.superNum && <div className="text-sm text-muted-foreground">超級獎: {draw.superNum}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div>無數據</div>
      )}
    </div>
  );
}
