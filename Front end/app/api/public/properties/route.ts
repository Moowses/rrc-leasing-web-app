import { NextResponse } from "next/server";
import { fetchPublicListings, publicListing } from "@/lib/public-listings";

export async function GET() {
  try {
    const response = await fetchPublicListings();
    if (!response.ok) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503 });
    const listings = await response.json();
    const mapped = Array.isArray(listings) ? listings.map(publicListing) : [];
    return NextResponse.json(mapped, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503 });
  }
}
