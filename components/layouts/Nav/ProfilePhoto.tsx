import { useState } from "react";

const FALLBACK = "/png/default.png";

function photoSource(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return FALLBACK;
  let source = value.trim();
  // Decode only a fully encoded URL. Decoding an ordinary URL can corrupt
  // signed query strings and escaped characters in asset paths.
  if (/^https?%3a/i.test(source)) {
    try {
      source = decodeURIComponent(source);
    } catch {
      return FALLBACK;
    }
  }
  if (source.startsWith("/") && !source.startsWith("//")) return source;
  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:" ? source : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export default function ProfilePhoto({ src, className }: { src?: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = photoSource(src);
  return (
    <img
      src={failedSource === source ? FALLBACK : source}
      alt=""
      className={`absolute inset-0 h-full w-full ${className || ""}`}
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(source)}
    />
  );
}
