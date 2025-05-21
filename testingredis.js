import React, { useEffect, useState } from "react";
import Redis from "ioredis";

// const redis = new Redis("rediss://red-cuvmm8t6l47c738urcs0:6379");
const redis = new Redis("rediss://red-cuvmm8t6l47c738urcs0:VsrYJ5it5JBVgAoH4DC9RJR7b725aEtW@oregon-keyvalue.render.com:6379");

const ServerSidePage = ({ data, redisStatus }) => {
  return (
    <div>
      <h1>Server-Side Rendered Page with Redis</h1>
      <p>Redis Connection Status: {redisStatus}</p>
      <p>Data fetched from API (cached if available):</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export async function getServerSideProps() {
  const cacheKey = "todo:1"; // Unique key for storing API response in Redis
  let redisStatus = "Connected successfully";

  try {
    // Test Redis connection
    await redis.ping();
    // Get all keys
    const keys = await redis.keys("*");
    console.log("Stored Redis Keys:", keys);
    // Check if key exists in Redis
    const keyExists = await redis.exists(cacheKey);
    console.log(`Key Exists: ${keyExists ? "Yes" : "No"}`);

    if (keyExists) {
      const cachedData = await redis.get(cacheKey);
      console.log("Cached Data Found:", cachedData);
      return { props: { data: JSON.parse(cachedData), redisStatus } };
    }

    // If not cached, fetch from API
    console.log("Fetching fresh data from API...");
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await res.json();

    // Store data in Redis for future requests (cache expires in 60 seconds)
    await redis.set(cacheKey, JSON.stringify(data), "EX", 60);
    console.log("New Data Cached!");

    return { props: { data, redisStatus } };
  } catch (error) {
    console.error("Error fetching data or connecting to Redis:", error);
    redisStatus = "Redis connection failed";
    return { props: { data: null, redisStatus } };
  }
}


export default ServerSidePage;
