import type { NextApiRequest, NextApiResponse } from "next";

export type FixedWindowResult = {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
};

type MemEntry = { count: number; resetAt: number };

/** Exported for unit tests; pass a fresh Map for isolation. */
export function memoryConsumeFixedWindow(
  store: Map<string, MemEntry>,
  key: string,
  max: number,
  windowMs: number
): FixedWindowResult {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return {
      ok: max >= 1,
      retryAfterSec: 0,
      remaining: Math.max(0, max - 1),
    };
  }

  entry.count += 1;
  if (entry.count > max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return {
    ok: true,
    retryAfterSec: 0,
    remaining: Math.max(0, max - entry.count),
  };
}

const globalMemStore = new Map<string, MemEntry>();

export function getClientIp(req: NextApiRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(xff) && xff[0]) {
    const first = String(xff[0]).split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || "unknown";
}

export async function consumeFixedWindowLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<FixedWindowResult> {
  const windowMs = windowSec * 1000;
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return memoryConsumeFixedWindow(globalMemStore, key, max, windowMs);
  }

  try {
    // Lazy require so environments without REDIS_URL never load the client (tests / edge cases).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const redis = require("../redis.js") as import("ioredis").default;
    const n = await redis.incr(key);
    if (n === 1) {
      await redis.expire(key, windowSec);
    }
    const ttl = await redis.ttl(key);
    if (n > max) {
      return {
        ok: false,
        retryAfterSec: Math.max(ttl > 0 ? ttl : 1, 1),
        remaining: 0,
      };
    }
    return {
      ok: true,
      retryAfterSec: 0,
      remaining: Math.max(0, max - n),
    };
  } catch (e: unknown) {
    console.warn("[fixedWindowRateLimit] Redis error, allowing request:", e);
    return { ok: true, retryAfterSec: 0, remaining: max };
  }
}

export function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @returns true if the response was ended with 429 (caller should return immediately).
 * @param options.identity - defaults to client IP; use a hashed email (etc.) for extra buckets.
 */
export async function respondIfRateLimited(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { scope: string; max: number; windowSec: number; identity?: string }
): Promise<boolean> {
  const id = options.identity ?? getClientIp(req);
  const key = `rl:fw:${options.scope}:${id}`;
  const result = await consumeFixedWindowLimit(key, options.max, options.windowSec);

  res.setHeader("X-RateLimit-Limit", String(options.max));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));

  if (!result.ok) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ error: "Too many requests. Try again later." });
    return true;
  }
  return false;
}
