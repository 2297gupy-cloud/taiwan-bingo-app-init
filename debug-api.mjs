import { getLatestDraws } from './server/google-api.ts';

async function test() {
  try {
    console.log('Testing getLatestDraws...');
    const draws = await getLatestDraws(1);
    console.log('Result:', JSON.stringify(draws, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
