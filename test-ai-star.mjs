import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc';

async function test() {
  try {
    console.log('=== 測試 1: 獲取 AI 一星時段配置 ===');
    const res1 = await fetch(`${API_URL}/aiStar.getSlots`);
    const data1 = await res1.json();
    console.log('Slots:', data1.result?.data?.slots?.length || 0, '個時段');
    
    console.log('\n=== 測試 2: 獲取今天 AI 預測 ===');
    const res2 = await fetch(`${API_URL}/aiStar.getPredictions?input={"dateStr":"2026-03-20"}`);
    const data2 = await res2.json();
    console.log('Predictions:', JSON.stringify(data2, null, 2).substring(0, 500));
    
    console.log('\n=== 測試 3: 獲取歷史日期 AI 預測 (2026-03-19) ===');
    const res3 = await fetch(`${API_URL}/aiStar.getPredictions?input={"dateStr":"2026-03-19"}`);
    const data3 = await res3.json();
    console.log('Historical predictions:', JSON.stringify(data3, null, 2).substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
