import fetch from 'node-fetch';

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/trpc/aiStar.getHourData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { dateStr: '2026-03-20', sourceHour: '07' }
      })
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
