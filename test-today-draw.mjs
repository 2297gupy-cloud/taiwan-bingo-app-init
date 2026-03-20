const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbwTn1ENAOBNtbxX9jQtayBJwiHtA72_1FCpLNYyxPDudU1IF4pJ13sRFd2DevSHe4rfmQ/exec';

async function test() {
  try {
    console.log('=== 測試 1: 獲取最新開獎 ===');
    const res1 = await fetch(`${GOOGLE_API_URL}?action=latest&n=3`);
    const json1 = await res1.json();
    console.log('Latest draws:');
    if (json1.data) {
      json1.data.forEach((d, i) => {
        console.log(`${i+1}. Period: ${d.period}, Date: ${d.date}`);
      });
    }
    
    console.log('\n=== 測試 2: 獲取今天數據 (2026-03-20) ===');
    const res2 = await fetch(`${GOOGLE_API_URL}?action=date&date=2026-03-20`);
    const json2 = await res2.json();
    console.log(`Found ${json2.data?.length || 0} records for 2026-03-20`);
    if (json2.data && json2.data.length > 0) {
      console.log('First record:', JSON.stringify(json2.data[0], null, 2).substring(0, 200));
    }
    
    console.log('\n=== 測試 3: 獲取昨天數據 (2026-03-19) ===');
    const res3 = await fetch(`${GOOGLE_API_URL}?action=date&date=2026-03-19`);
    const json3 = await res3.json();
    console.log(`Found ${json3.data?.length || 0} records for 2026-03-19`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
