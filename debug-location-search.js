const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test script to debug location search issues
async function debugLocationSearch() {
  console.log('🔍 Debugging Location Search Issues...\n');
  
  // Test cases that should work but don't
  const failingTests = [
    { query: '55443', description: 'Zip code 55443 (should find Yeamah E. Brewer)' },
    { query: 'Minneapolis', description: 'City Minneapolis (should find Yeamah E. Brewer)' }
  ];
  
  // Test cases that work
  const workingTests = [
    { query: 'Yeamah', description: 'Name Yeamah (works - finds Yeamah E. Brewer)' },
    { query: 'Brewer', description: 'Name Brewer (works - finds multiple Brewers)' },
    { query: 'Dallas', description: 'City Dallas (works - finds 3 results)' }
  ];
  
  console.log('📋 Testing FAILING searches:');
  for (const test of failingTests) {
    console.log(`\n🔍 Testing: ${test.description}`);
    try {
      const url = `http://localhost:3000/api/searchData?q=${encodeURIComponent(test.query)}&_t=${Date.now()}`;
      const { stdout } = await execAsync(`curl -s "${url}"`);
      const data = JSON.parse(stdout);
      
      console.log(`   Query: "${test.query}"`);
      console.log(`   Results: ${data.totalCount}`);
      if (data.totalCount === 0) {
        console.log(`   ❌ FAILED: Expected to find Yeamah E. Brewer`);
      } else {
        console.log(`   ✅ SUCCESS: Found ${data.totalCount} results`);
        data.data.slice(0, 2).forEach((result, index) => {
          console.log(`     ${index + 1}. ${result.fields?.['FULL NAME'] || 'Unknown'} - ${result.fields?.['Location (Nearest City)'] || 'No city'} - ${result.fields?.['Zip/Postal Code'] || 'No zip'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n📋 Testing WORKING searches:');
  for (const test of workingTests) {
    console.log(`\n🔍 Testing: ${test.description}`);
    try {
      const url = `http://localhost:3000/api/searchData?q=${encodeURIComponent(test.query)}&_t=${Date.now()}`;
      const { stdout } = await execAsync(`curl -s "${url}"`);
      const data = JSON.parse(stdout);
      
      console.log(`   Query: "${test.query}"`);
      console.log(`   Results: ${data.totalCount}`);
      if (data.totalCount > 0) {
        console.log(`   ✅ SUCCESS: Found ${data.totalCount} results`);
        data.data.slice(0, 2).forEach((result, index) => {
          console.log(`     ${index + 1}. ${result.fields?.['FULL NAME'] || 'Unknown'} - ${result.fields?.['Location (Nearest City)'] || 'No city'} - ${result.fields?.['Zip/Postal Code'] || 'No zip'}`);
        });
      } else {
        console.log(`   ❌ FAILED: Expected to find results`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Analysis:');
  console.log('The issue is that location field searches (zip code and city) are not working,');
  console.log('while name searches work fine. This suggests:');
  console.log('1. Field name format issues in MongoDB query');
  console.log('2. Data type mismatches (string vs number)');
  console.log('3. MongoDB query construction problems');
  console.log('\nNext steps: Check the MongoDB query construction in the search API.');
}

// Run the debug test
debugLocationSearch();
