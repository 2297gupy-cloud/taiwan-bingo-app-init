import fetch from 'node-fetch';

async function test() {
  try {
    console.log('=== AI 一星預測完整測試 ===\n');
    
    // 測試 1: 獲取時段配置
    console.log('1. 獲取時段配置:');
    const res1 = await fetch('http://localhost:3000/api/trpc/aiStar.getSlots');
    const data1 = await res1.json();
    if (data1.result?.data) {
      console.log(`   時段數量: ${data1.result.data.slots.length}`);
      console.log(`   當前時段: ${data1.result.data.currentSlot?.source}→${data1.result.data.currentSlot?.target}`);
      console.log(`   日期: ${data1.result.data.dateStr}`);
    }
    
    // 測試 2: 獲取今天的預測
    console.log('\n2. 獲取今天 (2026-03-20) 的 AI 預測:');
    const res2 = await fetch('http://localhost:3000/api/trpc/aiStar.getPredictions?input={"dateStr":"2026-03-20"}');
    const data2 = await res2.json();
    if (data2.result?.data) {
      console.log(`   預測數量: ${data2.result.data.length}`);
      if (data2.result.data.length > 0) {
        const first = data2.result.data[0];
        console.log(`   第一個預測:`);
        console.log(`     時段: ${first.sourceHour}→${first.targetHour}`);
        console.log(`     黃金球: ${first.goldenBalls.join(',')}`);
        console.log(`     推理: ${first.reasoning.substring(0, 50)}...`);
      }
    }
    
    // 測試 3: 獲取歷史日期的預測
    console.log('\n3. 獲取歷史日期 (2026-03-19) 的 AI 預測:');
    const res3 = await fetch('http://localhost:3000/api/trpc/aiStar.getPredictions?input={"dateStr":"2026-03-19"}');
    const data3 = await res3.json();
    if (data3.result?.data) {
      console.log(`   預測數量: ${data3.result.data.length}`);
    }
    
    // 測試 4: 檢查 AI 一星驗證功能
    console.log('\n4. 檢查 AI 一星驗證功能:');
    const res4 = await fetch('http://localhost:3000/api/trpc/aiStar.getVerifications?input={"dateStr":"2026-03-20"}');
    const data4 = await res4.json();
    if (data4.result?.data) {
      console.log(`   驗證記錄數: ${data4.result.data.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
