import fetch from 'node-fetch';

async function debugAPI() {
  try {
    // Test a specific shift endpoint
    const response = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/44343');
    const data = await response.json();
    
    console.log('\n🔍 Full API Response Structure:');
    console.log(JSON.stringify(data, null, 2));
    
    if (Array.isArray(data) && data.length > 0) {
      const shift = data[0];
      console.log('\n📋 Shift Object Keys:', Object.keys(shift));
      
      if (shift.attributes) {
        console.log('\n🏷️ Attributes Keys:', Object.keys(shift.attributes));
        
        // Check specific fields we're interested in
        const fields = ['custom_what_days_it_occurs', 'custom_start_time', 'custom_end_time', 'custom_shift_status'];
        fields.forEach(field => {
          if (shift.attributes[field]) {
            console.log(`\n${field}:`, shift.attributes[field]);
          }
        });
      }
      
      // Check if there's an 'object' property with actual shift data
      if (shift.object) {
        console.log('\n📦 Object Property:', shift.object);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAPI();