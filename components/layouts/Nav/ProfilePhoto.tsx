import Image from "next/image";
import { useState } from "react";

const FALLBACK = "/png/default.png";

export default function ProfilePhoto({ src, className }: { src?: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  let decoded = src || FALLBACK;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // A malformed escape should not prevent the navigation from rendering.
  }
  return (
    <Image
      src={failedSource === decoded ? FALLBACK : decoded}
      alt=""
      fill
      className={className}
      onError={() => setFailedSource(decoded)}
    />
  );
}
