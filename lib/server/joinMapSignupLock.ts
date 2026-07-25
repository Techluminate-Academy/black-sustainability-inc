import redis from "@/lib/redis";

const PREFIX = "join-map:signup-in-flight:";
const TTL_SECONDS = 120;

function keyForEmail(email: string): string {
  return `${PREFIX}${email.trim().toLowerCase()}`;
}

/**
 * Coordinates the Join Map request with the Mighty webhook for the same email.
 * Redis failures deliberately fail open so signup remains available.
 */
export async function beginJoinMapSignup(email: string): Promise<boolean> {
  try {
    await redis.set(keyForEmail(email), "1", "EX", TTL_SECONDS);
    return true;
  } catch (error) {
    console.warn(
      "[join-map-signup] unable to acquire webhook lock:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

export async function endJoinMapSignup(email: string): Promise<void> {
  try {
    await redis.del(keyForEmail(email));
  } catch (error) {
    console.warn(
      "[join-map-signup] unable to release webhook lock:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function isJoinMapSignupInFlight(email: string | undefined): Promise<boolean> {
  if (!email?.trim()) return false;
  try {
    return Boolean(await redis.get(keyForEmail(email)));
  } catch (error) {
    console.warn(
      "[join-map-signup] unable to read webhook lock:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}
