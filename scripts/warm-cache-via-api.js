const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// URLs to warm in cache
const urlsToWarm = [
  'http://localhost:3001/api/getData?page=1&limit=100',
  'http://localhost:3001/api/getData?page=2&limit=100',
  'http://localhost:3001/api/getData?page=1&limit=50',
  'http://localhost:3001/api/getData?industryHouse=Technology&page=1&limit=100',
  'http://localhost:3001/api/getData?industryHouse=Energy&page=1&limit=100',
  'http://localhost:3001/api/getData?industryHouse=Agriculture&page=1&limit=100',
  'http://localhost:3001/api/getData?industryHouse=Finance&page=1&limit=100',
];

async function warmCacheViaApi() {
  console.log('🔥 Starting Redis cache warming via API calls...');
  console.log('📝 Make sure your Next.js server is running on localhost:3001');
  console.log('');
  
  const startTime = Date.now();
  let warmedCount = 0;
  let totalTime = 0;
  
  for (let i = 0; i < urlsToWarm.length; i++) {
    const url = urlsToWarm[i];
    const queryName = url.split('?')[1] || 'homepage';
    
    try {
      console.log(`🔥 Warming cache for: ${queryName}`);
      const queryStart = Date.now();
      
      // Make API call to populate cache
      const { stdout, stderr } = await execAsync(`curl -s -w "%{http_code}" -o /dev/null "${url}"`);
      
      const queryTime = Date.now() - queryStart;
      const statusCode = stdout.trim();
      
      if (statusCode === '200') {
        warmedCount++;
        totalTime += queryTime;
        console.log(`   ✅ Cached successfully - ${queryTime}ms`);
      } else {
        console.log(`   ❌ Failed to cache - ${statusCode} - ${queryTime}ms`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   ❌ Error warming ${queryName}: ${error.message}`);
    }
  }
  
  const totalWarmTime = Date.now() - startTime;
  
  console.log('\n🎉 Cache warming completed!');
  console.log(`📊 Statistics:`);
  console.log(`   - URLs warmed: ${warmedCount}/${urlsToWarm.length}`);
  console.log(`   - Total time: ${totalWarmTime}ms`);
  console.log(`   - Average per query: ${Math.round(totalTime / warmedCount)}ms`);
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Run: node scripts/test-performance-simple.js');
  console.log('   2. Compare results with baseline performance');
}

// Run cache warming
warmCacheViaApi().catch(console.error);
