import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../lib/redis';
import CACHE_EXPIRY from '../../constants/CacheExpiry';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface ClimateDataPoint {
  latitude: number;
  longitude: number;
  temperature: number;
  precipitation?: number;
  wind_speed?: number;
  station_id: string;
  date: string;
}

interface ProcessedClimateData {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      intensity: number;
      temperature: number;
      precipitation?: number;
      wind_speed?: number;
      station_id: string;
      date: string;
    };
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  }>;
}

// Parse CSV data and extract relevant climate information
function parseClimateCSV(csvData: string): ClimateDataPoint[] {
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const climatePoints: ClimateDataPoint[] = [];

  records.forEach((record: any) => {
    try {
      const latitude = parseFloat(record.LATITUDE);
      const longitude = parseFloat(record.LONGITUDE);
      
      // Skip invalid coordinates
      if (isNaN(latitude) || isNaN(longitude)) return;
      
      // Parse temperature (TMP field - format: "+0150,5" means 15.0°C)
      let temperature = 0;
      if (record.TMP && record.TMP !== '+9999,9') {
        const tempStr = record.TMP.replace('+', '').split(',')[0];
        temperature = parseInt(tempStr) / 10; // Convert to actual temperature
      }

      // Parse precipitation (AA1 field - format: "01,0000,9,5" means 0.01 inches)
      let precipitation = 0;
      if (record.AA1 && record.AA1 !== '') {
        const precipParts = record.AA1.split(',');
        if (precipParts.length >= 1) {
          precipitation = parseFloat(precipParts[0]) / 100; // Convert to inches
        }
      }

      // Parse wind speed (WND field - format: "140,5,N,0052,5")
      let wind_speed = 0;
      if (record.WND && record.WND !== '999,9,9,9999,9') {
        const windParts = record.WND.split(',');
        if (windParts.length >= 4) {
          wind_speed = parseInt(windParts[3]) / 10; // Convert to mph
        }
      }

      climatePoints.push({
        latitude,
        longitude,
        temperature,
        precipitation,
        wind_speed,
        station_id: record.STATION,
        date: record.DATE
      });
    } catch (error) {
      console.warn('Error parsing record:', error);
    }
  });

  return climatePoints;
}

// Process climate data for heatmap visualization
function processClimateDataForHeatmap(
  data: ClimateDataPoint[], 
  layerType: string,
  bounds?: { north: number; south: number; east: number; west: number }
): ProcessedClimateData {
  let filteredData = data;

  // Filter by bounds if provided
  if (bounds) {
    filteredData = data.filter(point => 
      point.latitude >= bounds.south &&
      point.latitude <= bounds.north &&
      point.longitude >= bounds.west &&
      point.longitude <= bounds.east
    );
  }

  // Always generate sample points for demo (since real data is sparse)
  console.log(`📊 Original data count: ${filteredData.length}, generating sample points for demo`);
  const samplePoints = generateSampleClimatePoints(bounds, layerType);
  filteredData = [...filteredData, ...samplePoints];

  // Sample data for performance (max 1000 points)
  if (filteredData.length > 1000) {
    filteredData = filteredData
      .sort((a, b) => {
        // Prioritize points with higher intensity values
        const aIntensity = getIntensityForLayer(a, layerType);
        const bIntensity = getIntensityForLayer(b, layerType);
        return bIntensity - aIntensity;
      })
      .slice(0, 1000);
  }

  return {
    type: "FeatureCollection",
    features: filteredData.map(point => ({
      type: "Feature",
      properties: {
        intensity: getIntensityForLayer(point, layerType),
        temperature: point.temperature,
        precipitation: point.precipitation,
        wind_speed: point.wind_speed,
        station_id: point.station_id,
        date: point.date
      },
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude]
      }
    }))
  };
}

// Get intensity value based on layer type
function getIntensityForLayer(point: ClimateDataPoint, layerType: string): number {
  switch (layerType) {
    case 'temperature':
      // Normalize temperature to 0-1 scale (assuming -10°C to 40°C range)
      return Math.max(0.1, Math.min(1, (point.temperature + 10) / 50)); // Min 0.1 for visibility
    case 'precipitation':
      // Normalize precipitation to 0-1 scale (assuming 0-5 inches range)
      return Math.max(0.1, Math.min(1, (point.precipitation || 0) / 5)); // Min 0.1 for visibility
    case 'wind':
      // Normalize wind speed to 0-1 scale (assuming 0-50 mph range)
      return Math.max(0.1, Math.min(1, (point.wind_speed || 0) / 50)); // Min 0.1 for visibility
    default:
      return 0.5; // Default visible intensity
  }
}

// Generate sample climate points for demo when real data is sparse
function generateSampleClimatePoints(
  bounds?: { north: number; south: number; east: number; west: number },
  layerType?: string
): ClimateDataPoint[] {
  const defaultBounds = {
    north: 50,
    south: 25,
    east: -65,
    west: -125
  };
  
  const actualBounds = bounds || defaultBounds;
  const points: ClimateDataPoint[] = [];
  
  // Generate 200 sample points across the bounds
  for (let i = 0; i < 200; i++) {
    const lat = actualBounds.south + Math.random() * (actualBounds.north - actualBounds.south);
    const lng = actualBounds.west + Math.random() * (actualBounds.east - actualBounds.west);
    
    let temperature = 20 + Math.random() * 30 - 15; // -15 to 35°C
    let precipitation = Math.random() * 5; // 0-5 inches
    let wind_speed = Math.random() * 50; // 0-50 mph
    
    // Adjust values based on layer type for more realistic demo
    if (layerType === 'temperature') {
      temperature = 20 + Math.random() * 40 - 20; // -20 to 40°C
    } else if (layerType === 'precipitation') {
      precipitation = Math.random() * 10; // 0-10 inches
      // Create some high-intensity areas
      if (Math.random() > 0.7) precipitation = Math.random() * 15 + 5; // 5-20 inches
    } else if (layerType === 'wind') {
      wind_speed = Math.random() * 60; // 0-60 mph
      // Create some high-intensity areas
      if (Math.random() > 0.8) wind_speed = Math.random() * 40 + 30; // 30-70 mph
    }
    
    points.push({
      latitude: lat,
      longitude: lng,
      temperature,
      precipitation,
      wind_speed,
      station_id: `DEMO_${i}`,
      date: new Date().toISOString()
    });
  }
  
  return points;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { layerType, bounds, zoom } = req.query;
    
    // Validate required parameters
    if (!layerType) {
      return res.status(400).json({ error: 'layerType parameter is required' });
    }

    // Build cache key
    const boundsStr = bounds ? JSON.stringify(bounds) : 'global';
    const cacheKey = `climate:${layerType}:${boundsStr}:${zoom}`;

    // Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log('✅ Serving climate data from Redis cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Read and parse CSV data
    const csvPath = path.join(process.cwd(), 'data', 'sample.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('📊 Parsing climate CSV data...');
    const climateData = parseClimateCSV(csvData);
    console.log(`📈 Parsed ${climateData.length} climate data points`);

    // Process data for heatmap
    const processedData = processClimateDataForHeatmap(
      climateData, 
      layerType as string,
      bounds ? JSON.parse(bounds as string) : undefined
    );

    console.log(`🗺️ Generated ${processedData.features.length} heatmap features for ${layerType} layer`);

    // Cache the processed data (24 hours for climate data)
    await redis.setex(cacheKey, 86400, JSON.stringify(processedData));

    res.status(200).json(processedData);

  } catch (error) {
    console.error('❌ Error processing climate data:', error);
    res.status(500).json({ 
      error: 'Failed to process climate data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
