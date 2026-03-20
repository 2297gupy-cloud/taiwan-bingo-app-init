const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbwTn1ENAOBNtbxX9jQtayBJwiHtA72_1FCpLNYyxPDudU1IF4pJ13sRFd2DevSHe4rfmQ/exec';

async function test() {
  try {
    console.log('Fetching from Google API...');
    const response = await fetch(`${GOOGLE_API_URL}?action=latest&n=1`);
    const json = await response.json();
    console.log('Google API Response:');
    console.log(JSON.stringify(json, null, 2).substring(0, 1000));
    
    if (json.success && json.data && json.data.length > 0) {
      console.log('\nFirst record fields:');
      console.log(Object.keys(json.data[0]));
      console.log('\nFirst record:');
      console.log(JSON.stringify(json.data[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
