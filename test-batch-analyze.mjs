import fetch from 'node-fetch';

async function test() {
  try {
    console.log('=== 測試批量分析所有 24 個時段 ===\n');
    
    // 模擬登錄用戶（使用有效的 session cookie）
    const response = await fetch('http://localhost:3000/api/trpc/aiStar.batchAnalyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { dateStr: '2026-03-20' }
      })
    });
    
    const data = await response.json();
    
    if (data.result?.data) {
      console.log('批量分析結果：');
      console.log(`總時段數: ${data.result.data.length}`);
      console.log(`成功分析: ${data.result.data.filter(r => r.success).length}`);
      console.log(`失敗: ${data.result.data.filter(r => !r.success).length}`);
      
      // 顯示前 3 個時段的結果
      console.log('\n前 3 個時段的結果：');
      data.result.data.slice(0, 3).forEach((result, i) => {
        console.log(`\n時段 ${i}: ${result.sourceHour}:00~${result.sourceHour}:55`);
        if (result.success) {
          console.log(`  黃金球: ${result.goldenBalls?.join(', ')}`);
          console.log(`  推理: ${result.reasoning?.substring(0, 50)}...`);
        } else {
          console.log(`  錯誤: ${result.error}`);
        }
      });
    } else if (data.error) {
      console.log('錯誤:', data.error.json.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
