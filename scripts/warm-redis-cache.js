import { connectToDatabase } from '../lib/mongodb.js';
import redis from '../lib/redis.js';

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;
const MONGODB_DB = "members";
const COLLECTION_NAME = "airtableRecords";

// Cache expiry time (2 hours)
const CACHE_EXPIRY = 7200;

async function warmRedisCache() {
  try {
    console.log('🔥 Starting Redis cache warming...');
    const startTime = Date.now();
    
    const { db } = await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    const collection = db.collection(COLLECTION_NAME);
    
    // Define common query patterns to warm
    const commonQueries = [
      // Homepage patterns (most important)
      { industryHouse: '', page: 1, limit: 100, description: 'Homepage - All data' },
      { industryHouse: '', page: 2, limit: 100, description: 'Homepage - Page 2' },
      { industryHouse: '', page: 1, limit: 50, description: 'Homepage - Mobile view' },
      
      // Industry filters (common ones)
      { industryHouse: 'Technology', page: 1, limit: 100, description: 'Technology filter' },
      { industryHouse: 'Energy', page: 1, limit: 100, description: 'Energy filter' },
      { industryHouse: 'Agriculture', page: 1, limit: 100, description: 'Agriculture filter' },
      { industryHouse: 'Finance', page: 1, limit: 100, description: 'Finance filter' },
      
      // Pagination patterns
      { industryHouse: '', page: 3, limit: 100, description: 'Pagination - Page 3' },
      { industryHouse: '', page: 4, limit: 100, description: 'Pagination - Page 4' },
    ];
    
    let warmedCount = 0;
    let totalTime = 0;
    
    for (const query of commonQueries) {
      const queryStart = Date.now();
      
      try {
        const { industryHouse, page, limit } = query;
        const skip = (page - 1) * limit;
        
        // Build cache key (same as in getData.js)
        const cacheKey = `filterData:${industryHouse || "all"}:page=${page}:limit=${limit}`;
        
        // Check if already cached
        const existingCache = await redis.get(cacheKey);
        if (existingCache) {
          console.log(`⏭️  Skipping ${query.description} - already cached`);
          continue;
        }
        
        // Build MongoDB query
        let mongoQuery = {};
        if (industryHouse && industryHouse !== "") {
          mongoQuery["fields.PRIMARY INDUSTRY HOUSE"] = industryHouse;
        }
        
        // Fetch data from MongoDB
        const [totalCount, data] = await Promise.all([
          collection.countDocuments(mongoQuery),
          collection.find(mongoQuery)
            .skip(skip)
            .limit(limit)
            .sort({ _id: 1 })
            .toArray()
        ]);
        
        // Create response object
        const response = {
          success: true,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          data,
        };
        
        // Store in Redis cache
        await redis.setex(cacheKey, CACHE_EXPIRY, JSON.stringify(response));
        
        const queryTime = Date.now() - queryStart;
        totalTime += queryTime;
        warmedCount++;
        
        console.log(`✅ Warmed ${query.description} - ${queryTime}ms - ${data.length} records`);
        
      } catch (error) {
        console.error(`❌ Error warming ${query.description}:`, error.message);
      }
    }
    
    const totalWarmTime = Date.now() - startTime;
    
    console.log('\n🎉 Cache warming completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Queries warmed: ${warmedCount}/${commonQueries.length}`);
    console.log(`   - Total time: ${totalWarmTime}ms`);
    console.log(`   - Average per query: ${Math.round(totalTime / warmedCount)}ms`);
    console.log(`   - Cache expiry: ${CACHE_EXPIRY}s (${Math.round(CACHE_EXPIRY/3600)} hours)`);
    
    // Show current cache status
    const allKeys = await redis.keys('*');
    console.log(`   - Total cache entries: ${allKeys.length}`);
    
  } catch (error) {
    console.error('❌ Error during cache warming:', error);
  } finally {
    process.exit(0);
  }
}

// Run cache warming
warmRedisCache();
