import fetch from 'node:fetch';

async function test() {
  try {
    console.log('=== 測試批量分析 ===\n');
    
    const response = await fetch('http://localhost:3000/api/trpc/aiStar.batchAnalyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { dateStr: '2026-03-20' }
      })
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
