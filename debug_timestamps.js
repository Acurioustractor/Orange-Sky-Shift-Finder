async function debugTimestamps() {
  try {
    console.log('🔍 Investigating actual timestamp data...');
    
    // Test a specific shift endpoint
    const response = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/44343');
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const shift = data[0];
      
      console.log('\n⏰ Raw timestamp data from object property:');
      if (shift.object) {
        console.log('  start_timestamp:', shift.object.start_timestamp);
        console.log('  end_timestamp:', shift.object.end_timestamp);
        console.log('  timezone:', shift.object.timezone);
        console.log('  no_shift_time:', shift.object.no_shift_time);
        
        // Convert timestamps to readable dates
        if (shift.object.start_timestamp) {
          const startDate = new Date(shift.object.start_timestamp * 1000);
          console.log('  start_timestamp (readable):', startDate.toLocaleString());
        }
        
        if (shift.object.end_timestamp) {
          const endDate = new Date(shift.object.end_timestamp * 1000);
          console.log('  end_timestamp (readable):', endDate.toLocaleString());
        }
        
        // Check custom fields in object
        console.log('\n🏷️ Custom field values in object:');
        console.log('  custom_offering:', shift.object.custom_offering);
        console.log('  custom_service_type:', shift.object.custom_service_type);
        console.log('  custom_van_asset:', shift.object.custom_van_asset);
        console.log('  custom_what_days_it_occurs:', shift.object.custom_what_days_it_occurs);
        console.log('  custom_service_model:', shift.object.custom_service_model);
      }
      
      console.log('\n📅 Formatted date/time from nice property:');
      if (shift.nice) {
        // Look for formatted timestamp fields
        Object.keys(shift.nice).forEach(key => {
          if (key.includes('start_timestamp') || key.includes('end_timestamp')) {
            console.log(`  ${key}:`, shift.nice[key]);
          }
        });
      }
    }
    
    // Test a few more shifts to see the pattern
    console.log('\n\n🔍 Testing multiple shifts for pattern recognition...');
    const shiftIds = [44344, 44345, 44346];
    
    for (const shiftId of shiftIds) {
      try {
        const response = await fetch(`https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/${shiftId}`);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const shift = data[0];
          console.log(`\n📋 Shift ${shiftId}:`);
          
          if (shift.object) {
            const startDate = shift.object.start_timestamp ? new Date(shift.object.start_timestamp * 1000) : null;
            const endDate = shift.object.end_timestamp ? new Date(shift.object.end_timestamp * 1000) : null;
            
            console.log(`  Start: ${startDate ? startDate.toLocaleString() : 'N/A'}`);
            console.log(`  End: ${endDate ? endDate.toLocaleString() : 'N/A'}`);
            console.log(`  No shift time: ${shift.object.no_shift_time}`);
            console.log(`  Custom day field: ${shift.object.custom_what_days_it_occurs}`);
          }
        }
      } catch (err) {
        console.log(`  ❌ Could not fetch shift ${shiftId}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugTimestamps();