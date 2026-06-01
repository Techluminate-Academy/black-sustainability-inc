"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

/** Legacy URL: open the profile editor modal on the map home page. */
export default function UpdateProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    void router.replace({ pathname: "/", query: { updateProfile: "1" } });
  }, [router.isReady, router]);

  return null;
}
