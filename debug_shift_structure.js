async function debugShiftStructure() {
  try {
    console.log('🔍 Deep dive into shift data structure...');
    
    // Test a specific shift endpoint
    const response = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/44343');
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const shift = data[0];
      
      console.log('\n📋 All top-level keys:');
      Object.keys(shift).forEach(key => {
        console.log(`  ${key}: ${typeof shift[key]}`);
      });
      
      // Look for time-related fields in attributes
      if (shift.attributes) {
        console.log('\n⏰ Time-related fields in attributes:');
        Object.keys(shift.attributes).forEach(key => {
          if (key.includes('time') || key.includes('day') || key.includes('date') || key.includes('start') || key.includes('end')) {
            console.log(`  ${key}:`, shift.attributes[key]);
          }
        });
        
        console.log('\n📅 All timestamp fields:');
        Object.keys(shift.attributes).forEach(key => {
          if (key.includes('timestamp')) {
            console.log(`  ${key}:`, shift.attributes[key]);
          }
        });
        
        console.log('\n🔢 Fields with actual values (not just IDs):');
        Object.keys(shift.attributes).forEach(key => {
          const value = shift.attributes[key];
          if (value && typeof value === 'string' && value.length > 0 && !value.match(/^\d+$/)) {
            console.log(`  ${key}:`, value);
          }
        });
      }
      
      // Check if there are any nested objects with more data
      console.log('\n🔍 Looking for nested data structures:');
      Object.keys(shift).forEach(key => {
        if (typeof shift[key] === 'object' && shift[key] !== null) {
          console.log(`\n📦 ${key}:`);
          if (Array.isArray(shift[key])) {
            console.log(`  Array with ${shift[key].length} items`);
            if (shift[key].length > 0) {
              console.log(`  First item:`, shift[key][0]);
            }
          } else {
            console.log(`  Object keys:`, Object.keys(shift[key]));
            // Show a few key-value pairs
            Object.keys(shift[key]).slice(0, 5).forEach(subKey => {
              console.log(`    ${subKey}:`, shift[key][subKey]);
            });
          }
        }
      });
    }
    
    // Also try a different shift ID to see if the structure varies
    console.log('\n\n🔍 Checking another shift for comparison...');
    try {
      const response2 = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/44344');
      const data2 = await response2.json();
      
      if (Array.isArray(data2) && data2.length > 0) {
        const shift2 = data2[0];
        console.log('\n⏰ Time fields in second shift:');
        if (shift2.attributes) {
          Object.keys(shift2.attributes).forEach(key => {
            if (key.includes('time') || key.includes('day') || key.includes('date') || key.includes('start') || key.includes('end') || key.includes('timestamp')) {
              console.log(`  ${key}:`, shift2.attributes[key]);
            }
          });
        }
      }
    } catch (err) {
      console.log('Could not fetch second shift for comparison');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugShiftStructure();