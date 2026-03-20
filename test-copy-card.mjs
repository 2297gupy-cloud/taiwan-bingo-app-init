import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/trpc/aiStar.getHourData?input={"sourceHour":"12","copyRange":"","dateStr":"2026-03-20"}');
const data = await response.json();
console.log('Response:', JSON.stringify(data, null, 2));
