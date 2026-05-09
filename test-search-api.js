const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test script to debug search API functionality
async function testSearchAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing Search API...');
  
  // Test cases
  const testCases = [
    { query: '55443', description: 'Zip code 55443' },
    { query: 'Minneapolis', description: 'City Minneapolis' },
    { query: 'Yeamah', description: 'First name Yeamah' },
    { query: 'Brewer', description: 'Last name Brewer' },
    { query: 'Black Sustainability', description: 'Organization Black Sustainability' },
    { query: 'Stockholm', description: 'City Stockholm (should work)' },
    { query: 'Dallas', description: 'City Dallas (should work)' }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.description} (query: "${testCase.query}")`);
    
    try {
      const url = `${baseUrl}/api/searchData?q=${encodeURIComponent(testCase.query)}&_t=${Date.now()}`;
      console.log(`🔗 URL: ${url}`);
      
      const { stdout, stderr } = await execAsync(`curl -s "${url}"`);
      
      if (stderr) {
        console.log(`❌ Error: ${stderr}`);
        continue;
      }
      
      const data = JSON.parse(stdout);
      
      if (data.success) {
        console.log(`✅ Success: Found ${data.totalCount} results`);
        if (data.data && data.data.length > 0) {
          console.log('📄 Results:');
          data.data.slice(0, 3).forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.fields?.['FULL NAME'] || 'Unknown'} - ${result.fields?.['Location (Nearest City)'] || 'No city'} - ${result.fields?.['Zip/Postal Code'] || 'No zip'}`);
          });
        } else {
          console.log('❌ No results found');
        }
      } else {
        console.log(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Test completed');
}

// Run the test
testSearchAPI();
