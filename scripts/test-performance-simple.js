const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Test URLs to measure
const testUrls = [
  { url: 'http://localhost:3001/api/getData?page=1&limit=100', name: 'Homepage - All data' },
  { url: 'http://localhost:3001/api/getData?page=2&limit=100', name: 'Homepage - Page 2' },
  { url: 'http://localhost:3001/api/getData?page=1&limit=50', name: 'Homepage - Mobile view' },
  { url: 'http://localhost:3001/api/getData?industryHouse=Technology&page=1&limit=100', name: 'Technology filter' },
  { url: 'http://localhost:3001/api/getData?industryHouse=Energy&page=1&limit=100', name: 'Energy filter' },
];

async function testApiPerformance(url, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`   URL: ${url}`);
  
  const results = [];
  const iterations = 3; // Test each URL 3 times
  
  for (let i = 1; i <= iterations; i++) {
    try {
      const startTime = Date.now();
      
      // Use curl to test the API
      const { stdout, stderr } = await execAsync(`curl -s -w "%{http_code}" -o /dev/null "${url}"`);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const statusCode = stdout.trim();
      const isSuccess = statusCode === '200';
      
      results.push({
        iteration: i,
        responseTime,
        statusCode,
        isSuccess
      });
      
      console.log(`   Attempt ${i}: ${responseTime}ms (${statusCode}) ${isSuccess ? '✅' : '❌'}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`   Attempt ${i}: ERROR - ${error.message}`);
      results.push({
        iteration: i,
        responseTime: null,
        statusCode: 'ERROR',
        isSuccess: false
      });
    }
  }
  
  // Calculate statistics
  const successfulResults = results.filter(r => r.isSuccess);
  const responseTimes = successfulResults.map(r => r.responseTime);
  
  if (responseTimes.length > 0) {
    const avgTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const successRate = (successfulResults.length / iterations) * 100;
    
    console.log(`   📊 Results:`);
    console.log(`      Average: ${avgTime}ms`);
    console.log(`      Min: ${minTime}ms`);
    console.log(`      Max: ${maxTime}ms`);
    console.log(`      Success Rate: ${successRate}%`);
    
    return {
      testName,
      url,
      avgTime,
      minTime,
      maxTime,
      successRate,
      totalTests: iterations,
      successfulTests: successfulResults.length
    };
  } else {
    console.log(`   ❌ All tests failed`);
    return {
      testName,
      url,
      avgTime: null,
      minTime: null,
      maxTime: null,
      successRate: 0,
      totalTests: iterations,
      successfulTests: 0
    };
  }
}

async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests');
  console.log('================================');
  console.log('📝 Make sure your Next.js server is running on localhost:3001');
  console.log('');
  
  const allResults = [];
  
  for (const test of testUrls) {
    const result = await testApiPerformance(test.url, test.name);
    allResults.push(result);
  }
  
  // Summary
  console.log('\n📈 PERFORMANCE TEST SUMMARY');
  console.log('================================');
  
  const successfulTests = allResults.filter(r => r.successRate > 0);
  const failedTests = allResults.filter(r => r.successRate === 0);
  
  if (successfulTests.length > 0) {
    const avgResponseTime = Math.round(
      successfulTests.reduce((sum, r) => sum + r.avgTime, 0) / successfulTests.length
    );
    
    console.log(`✅ Successful Tests: ${successfulTests.length}/${allResults.length}`);
    console.log(`📊 Average Response Time: ${avgResponseTime}ms`);
    console.log(`⚡ Fastest Response: ${Math.min(...successfulTests.map(r => r.minTime))}ms`);
    console.log(`🐌 Slowest Response: ${Math.max(...successfulTests.map(r => r.maxTime))}ms`);
    
    console.log('\n📋 Individual Results:');
    successfulTests.forEach(result => {
      console.log(`   ${result.testName}: ${result.avgTime}ms (${result.successRate}% success)`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests: ${failedTests.length}`);
    failedTests.forEach(result => {
      console.log(`   ${result.testName}: ${result.url}`);
    });
  }
  
  console.log('\n🎯 Performance Assessment:');
  if (successfulTests.length > 0) {
    const avgTime = Math.round(
      successfulTests.reduce((sum, r) => sum + r.avgTime, 0) / successfulTests.length
    );
    
    if (avgTime < 200) {
      console.log('   🟢 EXCELLENT - Under 200ms average');
    } else if (avgTime < 500) {
      console.log('   🟡 GOOD - Under 500ms average');
    } else if (avgTime < 1000) {
      console.log('   🟠 FAIR - Under 1s average');
    } else {
      console.log('   🔴 POOR - Over 1s average');
    }
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Run: node scripts/warm-redis-cache.js');
  console.log('   2. Run this test again to see improvement');
}

// Run the tests
runPerformanceTests().catch(console.error);
