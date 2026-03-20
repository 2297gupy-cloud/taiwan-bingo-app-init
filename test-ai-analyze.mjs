import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc';

async function testGetDraws() {
  console.log('\n=== 測試 1: 獲取最新開獎數據 ===');
  try {
    const res = await fetch(`${API_URL}/draw.latest`);
    const data = await res.json();
    console.log('Latest draw:', JSON.stringify(data, null, 2).substring(0, 300));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetPredictions() {
  console.log('\n=== 測試 2: 獲取 AI 預測 ===');
  try {
    const res = await fetch(`${API_URL}/aiStar.getPredictions?input={"dateStr":"2026-03-20"}`);
    const data = await res.json();
    console.log('Predictions:', JSON.stringify(data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetSlots() {
  console.log('\n=== 測試 3: 獲取時段配置 ===');
  try {
    const res = await fetch(`${API_URL}/aiStar.getSlots`);
    const data = await res.json();
    console.log('Slots:', JSON.stringify(data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  await testGetDraws();
  await testGetPredictions();
  await testGetSlots();
}

runTests();
