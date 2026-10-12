import { NextResponse } from "next/server";

const apiOrigin = (process.env.RRC_PLATFORM_API_ORIGIN || "http://127.0.0.1:4180").replace(/\/$/, "");

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if (origin && origin !== url.origin) return NextResponse.json({ error: "Please submit this form from the RRC website." }, { status: 403 });
  try {
    const body = await request.json();
    const forwardedFor = request.headers.get("x-forwarded-for");
    const upstream = await fetch(`${apiOrigin}/api/public/leasing-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    return NextResponse.json(await upstream.json().catch(() => ({ error: "Your request could not be processed." })), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your request could not be sent. Please try again or email leasing@rosefoodrealtycorp.com." }, { status: 503 });
  }
}
