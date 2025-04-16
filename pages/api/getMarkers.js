import redis from "../../lib/redis";
import { connectToDatabase } from "../../lib/mongodb";
import { promisify } from "util";
import zlib from "zlib";  // Compression library
const COLLECTION_NAME = "airtableRecords";
import CACHE_EXPIRY from '../../constants/CacheExpiry';

const deflate = promisify(zlib.deflate);  // Promisified zlib deflate method
const inflate = promisify(zlib.inflate);  // Promisified zlib inflate method

export default async function handler(req, res) {
  try {

    // 🔹 Build cache key dynamically
    const cacheKey = `map-locations1`;

    // 🔹 Check Redis cache first
    const cacheStart = Date.now();
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      const decompressedData = await inflate(Buffer.from(cachedData, 'base64'));  // Decompress the data from Redis
      const parsedData = JSON.parse(decompressedData.toString());
      console.log(`✅ Served from Redis cache in ${Date.now() - cacheStart}ms`);
      return res.status(200).json(parsedData);
    }

    console.log(`❌ Cache miss. Querying MongoDB...`);

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // 🔹 Fetch data from MongoDB
    const mongoStart = Date.now();
    const pipeline = [
      {
        $project: {
          id: '$id',
          fields: {
            'FIRST NAME': '$fields.FIRST NAME',
            'LAST NAME': '$fields.LAST NAME',
            'EMAIL ADDRESS': '$fields.EMAIL ADDRESS',
            'WEBSITE': '$fields.WEBSITE',
            'BIO': '$fields.BIO',
            'MEMBER LEVEL': '$fields.MEMBER LEVEL',
            'PRIMARY INDUSTRY HOUSE': '$fields.PRIMARY INDUSTRY HOUSE',
            'Location (Nearest City)': '$fields.Location (Nearest City)',
            'ORGANIZATION NAME': '$fields.ORGANIZATION NAME'
          },
          location: {
            type: { $literal: 'Point' },
            coordinates: [
              { $convert: { input: '$fields.LONGITUDE (NEW)', to: 'double', onError: null, onNull: null } },
              { $convert: { input: '$fields.LATITUDE (NEW)', to: 'double', onError: null, onNull: null } }
            ]
          },
          _id: 0
        }
      },
      {
        $match: {
          'location.coordinates.0': { $ne: null },
          'location.coordinates.1': { $ne: null }
        }
      }
    ];
    

    const data = await collection.aggregate(pipeline).toArray();
    console.log(`MongoDB Fetch Time: ${Date.now() - mongoStart}ms`);

    const response = {
      success: true,
      data,
    };

    // 🔹 Compress the data before storing it in Redis
    const compressedData = await deflate(JSON.stringify(response));  // Compress the JSON string
    const compressedDataBase64 = compressedData.toString('base64');  // Convert to base64 for safe storage in Redis

    // 🔹 Store response in Redis cache with a 5-minute expiry
    await redis.setex(cacheKey, CACHE_EXPIRY, compressedDataBase64);

    console.log(`✅ Cached data for all records in Redis`);
    res.status(200).json(response);

  } catch (error) {
    console.error("❌ Error retrieving data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
