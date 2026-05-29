import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import {
  clearMemberLocationForTest,
  setMemberLocationOptOutForTest,
  setMemberTestLocationForTest,
} from "@/lib/domain/location/memberLocationFixture.service";

function isE2eFixtureEnabled(): boolean {
  if (process.env.E2E_TEST_ENABLED === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function getSecret(): string | null {
  const s = process.env.E2E_TEST_SECRET;
  return s ? s : null;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function parseAllowlist(): Set<string> {
  const raw =
    process.env.E2E_TEST_EMAIL_ALLOWLIST || "jerry@techluminateacademy.com";
  return new Set(
    raw
      .split(/[,\n]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

type FixtureAction =
  | "clearLocation"
  | "setTestLocation"
  | "clearOptOut"
  | "setOptOut";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isE2eFixtureEnabled()) {
    return res.status(404).json({ ok: false, error: "Not found" });
  }

  const incomingSecret = typeof req.body?.secret === "string" ? req.body.secret : "";
  const expected = getSecret();
  if (!expected || !incomingSecret || !constantTimeEquals(incomingSecret, expected)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const emailRaw = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Valid email required" });
  }

  const allow = parseAllowlist();
  if (!allow.has(email)) {
    return res.status(403).json({ ok: false, error: "Email not allowlisted for E2E fixtures" });
  }

  const action = req.body?.action as FixtureAction;
  const valid: FixtureAction[] = [
    "clearLocation",
    "setTestLocation",
    "clearOptOut",
    "setOptOut",
  ];
  if (!valid.includes(action)) {
    return res.status(400).json({
      ok: false,
      error: "action must be clearLocation|setTestLocation|clearOptOut|setOptOut",
    });
  }

  const { db } = await connectToDatabase();
  let matched = false;

  switch (action) {
    case "clearLocation":
      matched = await clearMemberLocationForTest(db, email);
      break;
    case "setTestLocation":
      matched = await setMemberTestLocationForTest(db, email);
      break;
    case "clearOptOut":
      matched = await setMemberLocationOptOutForTest(db, email, false);
      break;
    case "setOptOut":
      matched = await setMemberLocationOptOutForTest(db, email, true);
      break;
  }

  if (!matched) {
    return res.status(404).json({ ok: false, error: "Member not found in mightyMembers" });
  }

  await invalidateMightyMemberCaches().catch(() => {});

  return res.status(200).json({ ok: true, action, email });
}
