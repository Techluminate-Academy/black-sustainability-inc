import {
  memoryConsumeFixedWindow,
  getClientIp,
} from "@/lib/server/fixedWindowRateLimit";
import type { NextApiRequest } from "next";

describe("memoryConsumeFixedWindow", () => {
  it("allows up to max requests then blocks until window resets", () => {
    const store = new Map();
    const max = 3;
    const windowMs = 60_000;

    expect(memoryConsumeFixedWindow(store, "k", max, windowMs).ok).toBe(true);
    expect(memoryConsumeFixedWindow(store, "k", max, windowMs).ok).toBe(true);
    expect(memoryConsumeFixedWindow(store, "k", max, windowMs).remaining).toBe(0);
    const blocked = memoryConsumeFixedWindow(store, "k", max, windowMs);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("getClientIp", () => {
  it("prefers first x-forwarded-for hop", () => {
    const req = {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as NextApiRequest;
    expect(getClientIp(req)).toBe("203.0.113.1");
  });
});
