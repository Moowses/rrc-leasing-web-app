import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next/Image emits this exact static style on its server-rendered image tags.
const imageStyleHash = createHash('sha256').update('color:transparent').digest('base64');

export function proxy(request: NextRequest) {
  const previousLink = request.nextUrl.pathname.match(/^\/resubmit\/([A-Za-z0-9_-]{32,100})\/?$/);
  if (previousLink) {
    const destination = new URL('/resubmit', request.url);
    destination.hash = previousLink[1];
    const response = NextResponse.redirect(destination, 307);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }
  const nonce = randomBytes(16).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-hashes' 'sha256-${imageStyleHash}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|assets|favicon.ico).*)'],
};
