import fetch from 'node-fetch';

async function test() {
  try {
    console.log('=== 測試數據同步 ===\n');
    
    // 測試 1: 獲取最新開獎
    console.log('1. 獲取最新開獎數據:');
    const res1 = await fetch('http://localhost:3000/api/trpc/draw.latest');
    const data1 = await res1.json();
    if (data1.result?.data) {
      const d = data1.result.data;
      console.log(`   期號: ${d.drawNumber}`);
      console.log(`   時間: ${d.drawTime}`);
      console.log(`   號碼: ${d.numbers.slice(0, 5).join(',')}...`);
      console.log(`   超級號: ${d.superNumber}`);
    }
    
    // 測試 2: 獲取最近 5 期
    console.log('\n2. 獲取最近 5 期開獎:');
    const res2 = await fetch('http://localhost:3000/api/trpc/draw.recent?input={"limit":5}');
    const data2 = await res2.json();
    if (data2.result?.data) {
      console.log(`   共 ${data2.result.data.length} 期`);
      data2.result.data.forEach((d, i) => {
        console.log(`   ${i+1}. ${d.drawNumber} - ${d.drawTime}`);
      });
    }
    
    // 測試 3: 獲取歷史數據
    console.log('\n3. 獲取歷史開獎數據:');
    const res3 = await fetch('http://localhost:3000/api/trpc/draw.history?input={"page":1,"pageSize":5}');
    const data3 = await res3.json();
    if (data3.result?.data) {
      console.log(`   總共 ${data3.result.data.total} 期`);
      console.log(`   第 1 頁: ${data3.result.data.records.length} 期`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
