#!/usr/bin/env node

/**
 * Render Cache Warming Script
 * 
 * This script warms the Redis cache when deployed on Render.
 * It waits for the Next.js server to be ready, then warms the cache.
 * 
 * Usage:
 *   node scripts/render-cache-warmup.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 seconds

// URLs to warm in cache
const urlsToWarm = [
  'page=1&limit=100',      // Homepage - All data
  'page=2&limit=100',      // Homepage - Page 2
  'page=1&limit=50',       // Homepage - Mobile view
  'industryHouse=Technology&page=1&limit=100',
  'industryHouse=Energy&page=1&limit=100',
  'industryHouse=Agriculture&page=1&limit=100',
  'industryHouse=Finance&page=1&limit=100',
];

async function waitForServer() {
  console.log(`🔄 Waiting for server to be ready at ${BASE_URL}...`);
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const { stdout } = await execAsync(
        `curl -s -w "%{http_code}" -o /dev/null "${BASE_URL}"`
      );
      
      if (stdout.trim() === '200') {
        console.log('✅ Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`⏳ Attempt ${i + 1}/${MAX_RETRIES}... waiting ${RETRY_DELAY}ms`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }
  
  console.log('⚠️ Server not ready after max retries, proceeding anyway...');
  return false;
}

async function warmCacheViaApi() {
  console.log('🔥 Starting Redis cache warming via API calls...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log('');
  
  const startTime = Date.now();
  let warmedCount = 0;
  let totalTime = 0;
  
  for (let i = 0; i < urlsToWarm.length; i++) {
    const queryParams = urlsToWarm[i];
    const url = `${BASE_URL}/api/getData?${queryParams}`;
    const queryName = queryParams.split('&')[0];
    
    try {
      console.log(`🔥 Warming cache for: ${queryName}`);
      const queryStart = Date.now();
      
      try {
        // Make API call to populate cache with timeout
        const { stdout, stderr } = await Promise.race([
          execAsync(`curl -s -w "%{http_code}" -o /dev/null --max-time 30 "${url}"`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);
        
        const queryTime = Date.now() - queryStart;
        const statusCode = stdout.trim();
        
        if (statusCode === '200') {
          warmedCount++;
          totalTime += queryTime;
          console.log(`   ✅ Cached successfully - ${queryTime}ms`);
        } else {
          console.log(`   ⚠️  Got status ${statusCode} - ${queryTime}ms`);
        }
      } catch (error) {
        const queryTime = Date.now() - queryStart;
        console.log(`   ⚠️  Request failed - ${queryTime}ms`);
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
  if (warmedCount > 0) {
    console.log(`   - Average per query: ${Math.round(totalTime / warmedCount)}ms`);
  }
  
  return warmedCount > 0;
}

async function main() {
  console.log('🚀 Render Cache Warmup Script');
  console.log('================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');
  
  // Wait for server to be ready
  await waitForServer();
  
  console.log('');
  
  // Warm the cache
  const success = await warmCacheViaApi();
  
  console.log('');
  if (success) {
    console.log('✅ Cache warming completed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Cache warming had some issues but completed.');
    process.exit(0); // Don't fail the deployment
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Cache warming script failed:', error);
  process.exit(0); // Don't fail the deployment if cache warming fails
});

