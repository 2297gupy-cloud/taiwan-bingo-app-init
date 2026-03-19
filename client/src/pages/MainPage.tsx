import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';

export function MainPage() {
  const [activeTab, setActiveTab] = useState('live');
  const [latestPeriod, setLatestPeriod] = useState(0);

  // 30秒輪詢最新期別
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await (trpc.draw.checkLatest as any).query();
        if (result.success && result.data.latestPeriod > latestPeriod) {
          setLatestPeriod(result.data.latestPeriod);
        }
      } catch (error) {
        console.error('檢查最新期別失敗:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [latestPeriod]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-card border-b border-border p-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded ${activeTab === 'live' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}
        >
          📺 即時開獎
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded ${activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}
        >
          📄 歷史號碼
        </button>
      </nav>

      <div className="p-4">
        {activeTab === 'live' && <LiveDrawsTab latestPeriod={latestPeriod} />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}

function LiveDrawsTab({ latestPeriod }: { latestPeriod: number }) {
  const { data: draws, isLoading } = (trpc.draw.latest as any).useQuery({ n: 5 });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">最新開獎</h2>
      <div className="text-lg text-muted-foreground">最新期別: {latestPeriod || '載入中...'}</div>

      {isLoading ? (
        <div>載入中...</div>
      ) : draws?.data ? (
        <div className="space-y-4">
          {draws.data.map((draw: any) => (
            <div key={draw.period} className="p-4 bg-card rounded border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">期別: {draw.period}</span>
                <span className="text-sm text-muted-foreground">{draw.date} {draw.time}</span>
              </div>
              <div className="flex flex-wrap gap-2">
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
              {draw.superNum && <div className="mt-2 text-sm">超級獎: {draw.superNum}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div>無數據</div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const { data: draws, isLoading } = (trpc.draw.byDate as any).useQuery({ dateStr });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">歷史號碼</h2>

      <div className="flex gap-2">
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="px-3 py-2 border border-border rounded"
        />
      </div>

      {isLoading ? (
        <div>載入中...</div>
      ) : draws?.data ? (
        <div className="space-y-2">
          {draws.data.map((draw: any) => (
            <div key={draw.period} className="p-3 bg-card rounded border border-border text-sm">
              <span className="font-bold">{draw.period}</span> - {draw.time} - {draw.numbers}
            </div>
          ))}
        </div>
      ) : (
        <div>無數據</div>
      )}
    </div>
  );
}
