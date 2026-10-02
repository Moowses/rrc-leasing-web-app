import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApplicationError, createRecruitmentMailer, MAX_REQUEST_BYTES } from './recruitment-mail.mjs';
import { createViewingMailer, MAX_VIEWING_REQUEST_BYTES } from './viewing-mail.mjs';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ORIGINS = new Set(['http://127.0.0.1', 'http://localhost']);
const publicFiles = new Set(['index.html', 'resubmit.html', 'resubmit.js', 'styles.css', 'application.css', 'redesign.css', 'careers.css', 'app.js', 'properties.js', 'application.js', 'careers.js', 'vacancies.js']);
const assetTypes = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'],
]);
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
};

function reply(request, response, status, message, extraHeaders = {}) {
  const body = Buffer.from(message);
  response.writeHead(status, {
    ...securityHeaders,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

function jsonReply(request, response, status, payload, extraHeaders = {}) {
  reply(request, response, status, JSON.stringify(payload), { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
}

async function readApplication(request, { maxBytes = MAX_REQUEST_BYTES, description = 'application', sizeMessage = 'The application is too large. Use a resume no larger than 5 MB.' } = {}) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '') || request.headers['content-encoding']) {
    throw new ApplicationError(415, `Submit the ${description} as JSON.`);
  }
  if (Number(request.headers['content-length'] || 0) > maxBytes) {
    throw new ApplicationError(413, sizeMessage);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new ApplicationError(413, sizeMessage);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApplicationError(400, `The ${description} could not be read. Please try again.`); }
}

function createRateLimit() {
  const entries = new Map();
  const windowMs = 15 * 60 * 1000;
  return address => {
    const now = Date.now();
    for (const [key, record] of entries) if (record.until <= now) entries.delete(key);
    let record = entries.get(address);
    if (!record) {
      if (entries.size >= 2000) return false;
      record = { count: 0, until: now + windowMs };
      entries.set(address, record);
    }
    return ++record.count <= 5;
  };
}

function publicPath(requestTarget) {
  if (!requestTarget?.startsWith('/') || requestTarget.startsWith('//')) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(requestTarget.split('?')[0]);
  } catch {
    return null;
  }
  if (/[\\\u0000-\u001f\u007f:#]/.test(pathname)) return null;
  const segments = pathname.slice(1).split('/');
  if (segments.some(segment => segment.startsWith('.') || segment === '..')) return null;
  const filename = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (publicFiles.has(filename)) return filename;
  if (segments[0] !== 'assets' || segments.length < 2 || segments.some(segment => !segment)) return null;
  if (!assetTypes.has(path.extname(filename).toLowerCase())) return null;
  return filename;
}

function parsePublicOrigins(value) {
  if (!value?.trim()) return null;
  const origins = new Set();
  for (const item of value.split(',')) {
    const origin = item.trim();
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error('RRC_PUBLIC_ORIGINS must contain valid origins.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('RRC_PUBLIC_ORIGINS must contain origins such as https://www.example.com.');
    }
    origins.add(parsed.origin);
  }
  if (!origins.size) throw new Error('RRC_PUBLIC_ORIGINS must contain at least one origin.');
  return origins;
}

function parsePlatformApiOrigin(value) {
  const origin = value?.trim() || 'http://127.0.0.1:4180';
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.origin !== origin || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('RRC_PLATFORM_API_ORIGIN must be an exact HTTP(S) origin.');
  return parsed;
}

async function proxyPlatform(response, origin, pathname) {
  try {
    const upstream = await fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return reply({ method: 'GET' }, response, 503, 'Property content is temporarily unavailable.\n');
    const body = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(200, { ...securityHeaders, 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': upstream.headers.get('cache-control') || 'no-store' });
    response.end(body);
  } catch { reply({ method: 'GET' }, response, 503, 'Property content is temporarily unavailable.\n'); }
}

async function forwardLeasingRequest(request, response, platformApiOrigin, requestPolicy, allowAttempt) {
  if (request.method !== 'POST') return jsonReply(request, response, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!originAllowed(request, requestPolicy) || (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) return jsonReply(request, response, 403, { error: 'Submit leasing requests from this website only.' });
  if (!allowAttempt(request.socket.remoteAddress)) return jsonReply(request, response, 429, { error: 'Too many attempts. Please wait 15 minutes before trying again.' }, { 'Retry-After': '900' });
  try {
    const payload = await readApplication(request, { maxBytes: 12000, description: 'leasing request', sizeMessage: 'The leasing request is too large.' });
    const upstream = await fetch(new URL('/api/public/leasing-requests', platformApiOrigin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    const body = await upstream.json().catch(() => ({ error: 'The leasing request could not be processed.' }));
    return jsonReply(request, response, upstream.status, body);
  } catch (error) {
    const known = error instanceof ApplicationError;
    return jsonReply(request, response, known ? error.status : 503, { error: known ? error.message : 'Leasing requests are temporarily unavailable. Please try again later.' });
  }
}

async function forwardResubmission(request, response, platformApiOrigin, requestPolicy, route) {
  const match = route.match(/^\/api\/application-resubmission\/([A-Za-z0-9_-]{20,})(?:\/documents)?$/);
  if (!match) return jsonReply(request, response, 404, { error: 'Not found.' });
  const documents = route.endsWith('/documents');
  if (request.method === 'GET' && !documents) {
    try { const upstream = await fetch(new URL(`/api/public/application-resubmission/${match[1]}`, platformApiOrigin), { signal: AbortSignal.timeout(8000) }); return jsonReply(request, response, upstream.status, await upstream.json()); }
    catch { return jsonReply(request, response, 503, { error: 'Application documents are temporarily unavailable.' }); }
  }
  if (request.method !== 'POST' || !documents) return jsonReply(request, response, 405, { error: 'Method not allowed.' }, { Allow: documents ? 'POST' : 'GET' });
  if (!originAllowed(request, requestPolicy) || (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) return jsonReply(request, response, 403, { error: 'Submit documents from this website only.' });
  try { const payload = await readApplication(request, { maxBytes: 7_100_000, description: 'application document', sizeMessage: 'The document is too large. Use a file no larger than 5 MB.' }); const upstream = await fetch(new URL(`/api/public/application-resubmission/${match[1]}/documents`, platformApiOrigin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) }); return jsonReply(request, response, upstream.status, await upstream.json().catch(() => ({ error: 'Could not upload the document.' }))); }
  catch (error) { const known = error instanceof ApplicationError; return jsonReply(request, response, known ? error.status : 503, { error: known ? error.message : 'Application documents are temporarily unavailable.' }); }
}

function createRequestPolicy(env = process.env) {
  const publicOrigins = parsePublicOrigins(env.RRC_PUBLIC_ORIGINS);
  const localOnly = !publicOrigins;
  const allowedOrigins = publicOrigins || LOCAL_ORIGINS;
  const bindHost = env.RRC_BIND_HOST?.trim() || '127.0.0.1';
  if (!/^[A-Za-z0-9.:-]+$/.test(bindHost)) throw new Error('RRC_BIND_HOST contains invalid characters.');
  return {
    localOnly,
    allowedOrigins,
    bindHost,
    allowedHosts: new Set([...allowedOrigins].map(origin => new URL(origin).host)),
  };
}

function originAllowed(request, policy) {
  const origin = request.headers.origin;
  if (!origin) return false;
  if (policy.localOnly) return origin === `http://${request.headers.host}`;
  return policy.allowedOrigins.has(origin);
}

export async function createPreviewServer({ directory = siteDirectory, recruitmentMailer, viewingMailer, env = process.env } = {}) {
  const root = await realpath(directory);
  const mailer = recruitmentMailer || await createRecruitmentMailer({ env });
  const viewing = viewingMailer || await createViewingMailer({ env });
  const requestPolicy = createRequestPolicy(env);
  const platformApiOrigin = parsePlatformApiOrigin(env.RRC_PLATFORM_API_ORIGIN);
  const allowAttempt = createRateLimit();
  const allowViewingAttempt = createRateLimit();
  let activeApplications = 0;
  let activeViewings = 0;
  const server = http.createServer(async (request, response) => {
    const expectedPort = server.address()?.port;
    const localHosts = new Set([`127.0.0.1:${expectedPort}`, `localhost:${expectedPort}`]);
    const requestHost = request.headers.host;
    const hostAllowed = requestPolicy.localOnly ? localHosts.has(requestHost) : requestPolicy.allowedHosts.has(requestHost);
    if (!hostAllowed) {
      return reply(request, response, 403, 'This website does not accept that host.\n');
    }
    if (request.url?.split('?')[0] === '/healthz') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return jsonReply(request, response, 405, { ok: false, error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      return jsonReply(request, response, 200, { ok: true });
    }
    const route = request.url?.split('?')[0];
    if (route === '/api/properties') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return jsonReply(request, response, 405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      try {
        const upstream = await fetch(new URL('/api/public/properties', platformApiOrigin), { signal: AbortSignal.timeout(8000) });
        if (!upstream.ok) throw new Error('Unavailable');
        const listings = await upstream.json();
        const localImageUrl = imageUrl => typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl) ? imageUrl.replace(/^https?:\/\/[^/]+\/api\/public\/images\//, '/api/images/') : imageUrl;
        const body = listings.map(listing => ({ ...listing, imageUrl: localImageUrl(listing.imageUrl), images: Array.isArray(listing.images) ? listing.images.map(image => ({ ...image, url: localImageUrl(image.url) })) : [] }));
        return jsonReply(request, response, 200, body);
      } catch { return jsonReply(request, response, 503, { error: 'Property content is temporarily unavailable.' }); }
    }
    if (/^\/api\/images\/[a-z0-9]+$/i.test(route || '')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return reply(request, response, 405, 'Method not allowed.\n', { Allow: 'GET, HEAD' });
      return proxyPlatform(response, platformApiOrigin, `/api/public/images/${route.split('/').pop()}`);
    }
    if (route === '/api/leasing-requests') return forwardLeasingRequest(request, response, platformApiOrigin, requestPolicy, allowViewingAttempt);
    if (/^\/api\/application-resubmission\//.test(route || '')) return forwardResubmission(request, response, platformApiOrigin, requestPolicy, route);
    if (route === '/api/viewing/status') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return jsonReply(request, response, 405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      return jsonReply(request, response, 200, { enabled: viewing.enabled === true });
    }
    if (route === '/api/viewing') {
      if (request.method !== 'POST') return jsonReply(request, response, 405, { sent: false, error: 'Method not allowed.' }, { Allow: 'POST' });
      if (!originAllowed(request, requestPolicy) || (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) {
        return jsonReply(request, response, 403, { sent: false, error: 'Submit viewing requests from this website only.' });
      }
      if (!allowViewingAttempt(request.socket.remoteAddress)) return jsonReply(request, response, 429, { sent: false, error: 'Too many attempts. Please wait 15 minutes before trying again.' }, { 'Retry-After': '900' });
      if (!viewing.enabled) return jsonReply(request, response, 503, { sent: false, error: 'Online viewing requests are not connected to Leasing yet. Your request has not been sent. Please email leasing@rosefoodrealtycorp.com.' });
      if (activeViewings >= 4) return jsonReply(request, response, 429, { sent: false, error: 'Please try again in a minute.' }, { 'Retry-After': '60' });
      activeViewings++;
      try {
        const result = await viewing.send(await readApplication(request, { maxBytes: MAX_VIEWING_REQUEST_BYTES, description: 'viewing request', sizeMessage: 'The viewing request is too large. Keep your message within 1,000 characters.' }));
        return jsonReply(request, response, 200, result);
      } catch (error) {
        const known = error instanceof ApplicationError;
        return jsonReply(request, response, known ? error.status : 500, { sent: false, error: known ? error.message : 'The viewing request could not be processed. Please contact leasing@rosefoodrealtycorp.com.' });
      } finally { activeViewings--; }
    }
    if (route === '/api/recruitment/status') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return jsonReply(request, response, 405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      return jsonReply(request, response, 200, { enabled: mailer.enabled === true });
    }
    if (route === '/api/recruitment') {
      if (request.method !== 'POST') return jsonReply(request, response, 405, { sent: false, error: 'Method not allowed.' }, { Allow: 'POST' });
      if (!originAllowed(request, requestPolicy) || (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) {
        return jsonReply(request, response, 403, { sent: false, error: 'Submit applications from this website only.' });
      }
      if (!allowAttempt(request.socket.remoteAddress)) return jsonReply(request, response, 429, { sent: false, error: 'Too many attempts. Please wait 15 minutes before trying again.' }, { 'Retry-After': '900' });
      if (!mailer.enabled) return jsonReply(request, response, 503, { sent: false, error: 'Online applications are not connected to HR yet. Your application has not been sent. Please email recruitment@rosefoodrealtycorp.com with your resume.' });
      if (activeApplications >= 4) return jsonReply(request, response, 429, { sent: false, error: 'Please try again in a minute.' }, { 'Retry-After': '60' });
      activeApplications++;
      try {
        const result = await mailer.send(await readApplication(request));
        return jsonReply(request, response, 200, result);
      } catch (error) {
        const known = error instanceof ApplicationError;
        return jsonReply(request, response, known ? error.status : 500, { sent: false, error: known ? error.message : 'The application could not be processed. Please contact recruitment@rosefoodrealtycorp.com.' });
      } finally { activeApplications--; }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return reply(request, response, 405, 'Method not allowed.\n', { Allow: 'GET, HEAD' });
    }
    const filename = /^\/resubmit\/[A-Za-z0-9_-]{20,}$/.test(route || '') ? 'resubmit.html' : publicPath(request.url);
    if (!filename) return reply(request, response, 404, 'Not found.\n');

    const filepath = path.resolve(root, filename);
    if (!filepath.startsWith(root + path.sep)) return reply(request, response, 404, 'Not found.\n');
    try {
      // Reject aliases and symbolic links, including links to private files inside this folder.
      const actual = await realpath(filepath);
      if (actual !== filepath || !(await stat(actual)).isFile()) {
        return reply(request, response, 404, 'Not found.\n');
      }
      const body = await readFile(actual);
      const extension = path.extname(filename).toLowerCase();
      const contentType = extension === '.html' ? 'text/html; charset=utf-8'
        : extension === '.css' ? 'text/css; charset=utf-8'
        : extension === '.js' ? 'text/javascript; charset=utf-8'
        : assetTypes.get(extension);
      response.writeHead(200, { ...securityHeaders, 'Content-Type': contentType, 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EACCES' || error.code === 'EPERM') {
        return reply(request, response, 404, 'Not found.\n');
      }
      console.error('Preview could not read a public file:', error.message);
      reply(request, response, 500, 'The preview could not load this file.\n');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 64;
  server.requestPolicy = requestPolicy;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portText = process.env.PORT || '4173';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be a whole number from 1 to 65535. Default: 4173.');
    process.exitCode = 1;
  } else {
    let server;
    try { server = await createPreviewServer(); }
    catch (error) {
      console.error(`Unable to start: ${error.message}`);
      process.exitCode = 1;
      process.exit();
    }
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${port} is already in use. Stop the other preview or set PORT to an unused port.`
        : `Unable to start preview: ${error.message}`);
      process.exitCode = 1;
    });
    const bindHost = server.requestPolicy.bindHost;
    const configuredOrigins = process.env.RRC_PUBLIC_ORIGINS?.trim();
    server.listen(port, bindHost, () => {
      console.log(`RRC website server listening on ${configuredOrigins || `http://127.0.0.1:${port}`}`);
      console.log('Recruitment and viewing email each require explicit server configuration; tenant applications remain a preview. Press Ctrl+C to stop.');
    });
    const shutdown = signal => {
      console.log(`${signal} received; finishing active requests.`);
      server.close(error => { if (error) { console.error(`Shutdown failed: ${error.message}`); process.exitCode = 1; } });
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  }
}
