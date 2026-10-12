import { NextResponse } from "next/server";

const apiOrigin = (process.env.RRC_PLATFORM_API_ORIGIN || "http://127.0.0.1:4180").replace(/\/$/, "");

function localImagePath(value: string) {
  const match = value.match(/\/api\/public\/images\/([A-Za-z0-9_-]+)/);
  return match ? `/api/public/images/${match[1]}` : value.startsWith("/") ? value : "";
}

export async function GET() {
  try {
    const response = await fetch(`${apiOrigin}/api/public/properties`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503 });
    const listings = await response.json();
    const mapped = Array.isArray(listings) ? listings.map((item) => ({
      ...item,
      imageUrl: localImagePath(String(item.imageUrl || "")),
      images: Array.isArray(item.images) ? item.images.map((image: { url?: string }) => ({ ...image, url: localImagePath(String(image.url || "")) })) : [],
    })) : [];
    return NextResponse.json(mapped, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503 });
  }
}
