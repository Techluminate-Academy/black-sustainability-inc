#!/bin/bash

# Render Startup Script with Cache Warming
# This script starts the Next.js server and warms the cache in the background

echo "🚀 Starting Black Sustainability Inc application on Render..."
echo ""

# Start the Next.js server in the background
echo "📦 Starting Next.js server..."
npm start &
NEXT_PID=$!

# Wait a bit for the server to start
echo "⏳ Waiting for server to initialize..."
sleep 5

# Warm the cache in the background (don't block the server start)
echo "🔥 Starting cache warming process..."
node scripts/render-cache-warmup.js > /tmp/cache-warmup.log 2>&1 &
CACHE_WARMUP_PID=$!

echo "✅ Server started (PID: $NEXT_PID)"
echo "✅ Cache warming started (PID: $CACHE_WARMUP_PID)"
echo ""

# Wait for the Next.js server process
wait $NEXT_PID

