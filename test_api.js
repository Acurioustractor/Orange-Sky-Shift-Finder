import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing Orange Sky API...');
    const response = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/44343');
    
    if (!response.ok) {
      console.log('Response not OK:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('\n🔍 Raw API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n📋 First shift object keys:', Object.keys(data[0]));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();