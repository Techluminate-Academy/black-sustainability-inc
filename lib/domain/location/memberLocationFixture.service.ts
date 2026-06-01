import type { Db } from "mongodb";

const TEST_LOCATION = {
  location: "New York, NY, USA",
  latitude: 40.7128,
  longitude: -74.006,
};

function emailRegex(email: string): RegExp {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export async function clearMemberLocationForTest(db: Db, email: string): Promise<boolean> {
  const now = new Date();
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $unset: {
        location: "",
        latitude: "",
        longitude: "",
        geo: "",
        memberLocationUpdatedAt: "",
      },
      $set: {
        locationPromptOptOut: false,
        updatedAt: now,
      },
    }
  );
  return result.matchedCount > 0;
}

export async function setMemberTestLocationForTest(db: Db, email: string): Promise<boolean> {
  const now = new Date();
  const { location, latitude, longitude } = TEST_LOCATION;
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $set: {
        location,
        latitude,
        longitude,
        geo: { type: "Point", coordinates: [longitude, latitude] },
        memberLocationUpdatedAt: now,
        locationPromptOptOut: false,
        updatedAt: now,
        source: "test:fixture",
      },
    }
  );
  return result.matchedCount > 0;
}

export async function setMemberLocationOptOutForTest(
  db: Db,
  email: string,
  optOut: boolean
): Promise<boolean> {
  const now = new Date();
  const result = await db.collection("mightyMembers").updateOne(
    { email: emailRegex(email) },
    {
      $set: {
        locationPromptOptOut: optOut,
        ...(optOut ? { locationPromptOptOutAt: now } : {}),
        updatedAt: now,
      },
      ...(optOut ? {} : { $unset: { locationPromptOptOutAt: "" } }),
    }
  );
  return result.matchedCount > 0;
}

export { TEST_LOCATION };
