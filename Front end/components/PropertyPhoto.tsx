"use client";

import { useState } from "react";

export default function PropertyPhoto({ src, alt, eager = false }: { src?: string; alt: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || failedSource === src) return <div className="property-photo-fallback">{src ? "Photo unavailable" : "No photo available"}</div>;
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedSource(src)} />;
}
