const Redis = require("ioredis");

const redis = new Redis("rediss://red-cuvmm8t6l47c738urcs0:VsrYJ5it5JBVgAoH4DC9RJR7b725aEtW@oregon-keyvalue.render.com:6379");

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis error:", err));


export default redis