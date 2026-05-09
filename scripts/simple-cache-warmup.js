#!/usr/bin/env node

/**
 * Simple Cache Warmup for Render
 * This is a minimal script that warms the cache without server checks
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Get the base URL from environment or use localhost for testing
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

// URLs to warm in cache (minimal set)
const urlsToWarm = [
  'page=1&limit=100',      // Most important - homepage
];

async function warmCache() {
  console.log('🔥 Starting cache warmup...');
  console.log(`📍 Target: ${BASE_URL}`);
  
  let successCount = 0;
  
  for (const queryParams of urlsToWarm) {
    const url = `${BASE_URL}/api/getData?${queryParams}`;
    
    try {
      console.log(`Warming: /api/getData?${queryParams}`);
      
      // Simple curl request with timeout
      await Promise.race([
        execAsync(`curl -s -w "%{http_code}" -o /dev/null --max-time 15 "${url}"`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      
      successCount++;
      console.log('✅ Success');
      
    } catch (error) {
      console.log('⚠️ Failed (continuing anyway)');
    }
  }
  
  console.log(`\n🎉 Cache warmup complete: ${successCount}/${urlsToWarm.length} successful`);
}

// Run warmup
warmCache().catch(() => {
  console.log('Cache warmup had issues but continuing...');
}).finally(() => {
  process.exit(0); // Always exit successfully
});

