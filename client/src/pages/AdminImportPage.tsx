import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function AdminImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const importMutation = trpc.admin.importLotteryData.useMutation();

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setProgress(0);
      setResult(null);

      // 讀取 JSON 數據
      const response = await fetch('/tmp/import_data.json');
      const data = await response.json();

      console.log(`準備導入 ${data.length} 筆記錄...`);

      // 分批導入
      const batchSize = 100;
      let totalInserted = 0;
      let totalSkipped = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, Math.min(i + batchSize, data.length));
        
        try {
          const res = await importMutation.mutateAsync({
            data: batch,
          });

          totalInserted += res.inserted;
          totalSkipped += res.skipped;

          setProgress(Math.round(((i + batchSize) / data.length) * 100));
          console.log(`進度: ${Math.min(i + batchSize, data.length)}/${data.length}`);
        } catch (err) {
          console.error(`批次 ${i}-${i + batchSize} 導入失敗:`, err);
        }
      }

      setResult({
        success: true,
        inserted: totalInserted,
        skipped: totalSkipped,
        total: data.length,
      });
    } catch (err) {
      console.error('導入失敗:', err);
      setResult({
        success: false,
        error: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">台彩開獎數據導入</h1>

        <div className="space-y-4">
          <Button
            onClick={handleImport}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? '正在導入...' : '開始導入'}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-600">進度: {progress}%</p>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.success ? (
                <>
                  <p className="font-bold text-green-800">導入成功！</p>
                  <p className="text-green-700">新增: {result.inserted} 筆</p>
                  <p className="text-green-700">跳過: {result.skipped} 筆</p>
                  <p className="text-green-700">總計: {result.total} 筆</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-red-800">導入失敗！</p>
                  <p className="text-red-700">{result.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
