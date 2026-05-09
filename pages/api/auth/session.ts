import type { NextApiRequest, NextApiResponse } from "next";
import { getBsnSessionFromReq } from "../../../lib/bsnSession";

/** Public session shape for the map UI (matches Nav expectations loosely). */
function sessionUserFromPayload(payload: NonNullable<ReturnType<typeof getBsnSessionFromReq>>) {
  return {
    email: payload.email,
    mightyId: payload.mightyId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    profile: {
      profilePhoto: { url: "" as string },
    },
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ authenticated: false });
  }

  const session = getBsnSessionFromReq(req);
  if (!session) {
    return res.status(200).json({ authenticated: false, user: null });
  }

  return res.status(200).json({
    authenticated: true,
    user: sessionUserFromPayload(session),
  });
}
