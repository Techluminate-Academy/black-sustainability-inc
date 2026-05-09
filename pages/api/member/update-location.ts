import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { getBsnSessionFromReq } from "@/lib/bsnSession";
import { invalidateMightyMemberCaches } from "@/lib/mightyCacheInvalidate";
import { upsertAirtableMightyMember } from "@/lib/airtableMightyMembers";
import { upsertMightyCustomFieldAnswer } from "@/lib/mightyAdmin";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const location =
    typeof req.body?.location === "string" ? req.body.location.trim() : "";
  const latitude = req.body?.latitude;
  const longitude = req.body?.longitude;

  if (!location || location.length < 2 || location.length > 140) {
    return res.status(400).json({ ok: false, error: "Valid location required" });
  }

  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ ok: false, error: "Valid latitude required" });
  }
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ ok: false, error: "Valid longitude required" });
  }

  const mightyId = session.mightyId;
  const email = session.email;
  const now = new Date();

  // 1) Update Mongo (source of truth for map)
  const { db } = await connectToDatabase();
  const coll = db.collection("mightyMembers");
  await coll.updateOne(
    { mightyId },
    {
      $set: {
        email,
        mightyId,
        location,
        latitude,
        longitude,
        geo: { type: "Point", coordinates: [longitude, latitude] },
        memberLocationUpdatedAt: now,
        updatedAt: now,
        source: "member:self-update",
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 2) Best-effort update Airtable (Mighty Members table)
  Promise.resolve()
    .then(() =>
      upsertAirtableMightyMember({
        mightyId,
        email,
        firstName: session.firstName ?? undefined,
        lastName: session.lastName ?? undefined,
        location,
        latitude,
        longitude,
      })
    )
    .catch((e) => {
      console.error("[member/update-location] Airtable update failed (non-fatal):", {
        message: (e as any)?.message,
      });
    });

  // 3) Best-effort update Mighty (custom field answer)
  Promise.resolve()
    .then(async () => {
      const customFieldIdRaw = process.env.MIGHTY_MAP_LOCATION_CUSTOM_FIELD_ID;
      const customFieldId = customFieldIdRaw ? Number(customFieldIdRaw) : NaN;
      if (Number.isFinite(customFieldId)) {
        const ans = await upsertMightyCustomFieldAnswer({
          customFieldId,
          mightyMemberId: mightyId,
          text: location,
        });
        if (!ans.ok) {
          console.warn("[member/update-location] Mighty custom field answer failed (non-fatal):", ans);
        }
      }
    })
    .catch((e) => {
      console.warn("[member/update-location] Mighty update threw (non-fatal):", {
        message: (e as any)?.message,
      });
    });

  // 4) Cache busting so map/list reflects new coords quickly
  Promise.resolve()
    .then(() => invalidateMightyMemberCaches())
    .catch(() => {});

  return res.status(200).json({ ok: true });
}

