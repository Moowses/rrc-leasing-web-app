import type { Listing } from "./types";

const apiOrigin = (process.env.RRC_PLATFORM_API_ORIGIN || "http://127.0.0.1:4180").replace(/\/$/, "");

function localImagePath(value: string) {
  // Also accept the old API's absolute loopback URLs during a rolling update.
  const match = value.match(/\/api\/public\/images\/([A-Za-z0-9_-]{1,80})$/);
  return match ? `/api/public/images/${match[1]}` : /^\/assets\/[\w.-]+$/.test(value) ? value : "";
}

export function publicListing(item: Listing): Listing {
  return {
    ...item,
    imageUrl: localImagePath(item.imageUrl || ""),
    images: (item.images || []).map(image => ({ ...image, url: localImagePath(image.url || "") })).filter(image => image.url),
  };
}

export function fetchPublicListings(reference?: string) {
  const suffix = reference ? `/${encodeURIComponent(reference)}` : "";
  return fetch(`${apiOrigin}/api/public/properties${suffix}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
}
