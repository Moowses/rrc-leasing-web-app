import { NextResponse } from "next/server";

const apiOrigin = (process.env.RRC_PLATFORM_API_ORIGIN || "http://127.0.0.1:4180").replace(/\/$/, "");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  try {
    const response = await fetch(`${apiOrigin}/api/public/images/${id}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: "Image not found." }, { status: response.status });
    return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Image is temporarily unavailable." }, { status: 503 });
  }
}
