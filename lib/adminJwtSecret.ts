/**
 * Admin dashboard JWT signing/verification. Never use a hardcoded fallback secret.
 */
export function getAdminJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) {
    throw new Error(
      "JWT_SECRET is not configured. Set JWT_SECRET in the environment for admin auth."
    );
  }
  return s;
}
