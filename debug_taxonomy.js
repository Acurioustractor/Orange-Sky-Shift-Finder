async function debugTaxonomy() {
  try {
    console.log('🔍 Investigating Orange Sky taxonomy endpoints...');
    
    // First, let's check what taxonomies are available
    const taxonomiesResponse = await fetch('https://orangesky.org.au/wp-json/wp/v2/taxonomies');
    const taxonomies = await taxonomiesResponse.json();
    
    console.log('\n📋 Available Taxonomies:');
    console.log(Object.keys(taxonomies));
    
    // Look for custom taxonomies that might contain our field values
    const customTaxonomies = Object.keys(taxonomies).filter(key => 
      key.includes('service') || key.includes('shift') || key.includes('van') || key.includes('day')
    );
    
    console.log('\n🎯 Relevant Taxonomies:', customTaxonomies);
    
    // Try to fetch terms from common taxonomy endpoints
    const possibleEndpoints = [
      'service_type',
      'shift_status', 
      'van_asset',
      'day_type',
      'what_days_it_occurs',
      'service-type',
      'shift-status',
      'van-asset'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`\n🔍 Trying endpoint: ${endpoint}`);
        const response = await fetch(`https://orangesky.org.au/wp-json/wp/v2/${endpoint}`);
        
        if (response.ok) {
          const terms = await response.json();
          console.log(`✅ Found ${endpoint}:`, terms.slice(0, 3)); // Show first 3 terms
          
          // Look for terms with IDs that match our numeric values
          const relevantTerms = terms.filter(term => 
            ['134059', '139033', '134060', '134061'].includes(term.id?.toString())
          );
          
          if (relevantTerms.length > 0) {
            console.log(`🎯 Matching terms in ${endpoint}:`, relevantTerms);
          }
        }
      } catch (err) {
        // Silently continue if endpoint doesn't exist
      }
    }
    
    // Also try the custom field definitions endpoint
    console.log('\n🔍 Checking custom field definitions...');
    try {
      const fieldsResponse = await fetch('https://orangesky.org.au/wp-json/knd_rostify/v1/custom_fields');
      if (fieldsResponse.ok) {
        const fields = await fieldsResponse.json();
        console.log('\n📋 Custom Field Definitions:');
        
        // Look for field definitions that might help us decode the values
        fields.forEach(field => {
          if (field.name && (field.name.includes('day') || field.name.includes('time') || field.name.includes('status'))) {
            console.log(`\n🏷️ ${field.name}:`, field);
          }
        });
      }
    } catch (err) {
      console.log('❌ Custom fields endpoint not accessible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugTaxonomy();