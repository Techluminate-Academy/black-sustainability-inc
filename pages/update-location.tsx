"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

/** Legacy URL: open the update-location modal on the map home page. */
export default function UpdateLocationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const query: Record<string, string> = { updateLocation: "1" };
    const forced = router.query.forced;
    const next = router.query.next;
    if (forced === "1" || forced === "true") query.forced = "1";
    if (typeof next === "string" && next.startsWith("/")) query.next = next;
    if (!query.forced && !query.next) query.forced = "1";
    void router.replace({ pathname: "/", query });
  }, [router.isReady, router.query.forced, router.query.next, router]);

  return null;
}
