/**
 * Dev-only: set bsn_user_data cookie to impersonate a user (for map visibility testing).
 * Only works when NODE_ENV === "development". Returns 404 in production.
 *
 * Usage:
 *   Sign in as P1:  GET /api/dev/login-as?email=aoberdorf.3@outlook.com
 *   Sign in as NP1: GET /api/dev/login-as?email=martine.malivers@yahoo.com
 *   Sign out:       GET /api/dev/login-as   (no email = clear cookie)
 */
export default async function handler(req, res) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).end();
  }

  if (req.method !== "GET") {
    return res.status(405).setHeader("Allow", "GET").end();
  }

  const email = typeof req.query.email === "string" ? req.query.email.trim() : null;

  const cookieName = "bsn_user_data";
  const cookieOptions = "Path=/; Max-Age=86400; SameSite=Lax"; // 24h; not HttpOnly so you can clear in DevTools

  if (email) {
    const value = encodeURIComponent(JSON.stringify({ loginEmail: email }));
    res.setHeader("Set-Cookie", `${cookieName}=${value}; ${cookieOptions}`);
  } else {
    res.setHeader("Set-Cookie", `${cookieName}=; Path=/; Max-Age=0`);
  }

  res.redirect(302, "/");
}
