import fetch from 'node-fetch';

async function test() {
  try {
    console.log('=== 測試修復後的時段數據查詢 ===\n');
    
    // 測試 1: 查詢 07 時段數據
    console.log('1. 查詢 07:00~07:55 時段數據:');
    const res1 = await fetch('http://localhost:3000/api/trpc/aiStar.getHourData?input={"dateStr":"2026-03-20","sourceHour":"07"}');
    const data1 = await res1.json();
    if (data1.result?.data?.text) {
      const lines = data1.result.data.text.split('\n').slice(0, 5);
      console.log(lines.join('\n'));
      console.log('... [數據正常]\n');
    } else {
      console.log('無數據:', JSON.stringify(data1, null, 2).substring(0, 200));
    }
    
    // 測試 2: 查詢 10 時段數據
    console.log('2. 查詢 10:00~10:55 時段數據:');
    const res2 = await fetch('http://localhost:3000/api/trpc/aiStar.getHourData?input={"dateStr":"2026-03-20","sourceHour":"10"}');
    const data2 = await res2.json();
    if (data2.result?.data?.text) {
      const lines = data2.result.data.text.split('\n').slice(0, 5);
      console.log(lines.join('\n'));
      console.log('... [數據正常]\n');
    } else {
      console.log('無數據:', JSON.stringify(data2, null, 2).substring(0, 200));
    }
    
    // 測試 3: 查詢 20 時段數據
    console.log('3. 查詢 20:00~20:55 時段數據:');
    const res3 = await fetch('http://localhost:3000/api/trpc/aiStar.getHourData?input={"dateStr":"2026-03-20","sourceHour":"20"}');
    const data3 = await res3.json();
    if (data3.result?.data?.text) {
      const lines = data3.result.data.text.split('\n').slice(0, 5);
      console.log(lines.join('\n'));
      console.log('... [數據正常]\n');
    } else {
      console.log('無數據:', JSON.stringify(data3, null, 2).substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
