import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://platform:password@localhost:5432/platform',
  RRC_PLATFORM_ORIGINS: 'http://127.0.0.1:4173',
  RRC_AUTH_PROVIDER: 'unconfigured',
});

test('health and readiness endpoints expose no sensitive configuration', async t => {
  const app = buildApp(config);
  t.after(() => app.close());

  const health = await app.inject({ method: 'GET', url: '/healthz' });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { ok: true });

  const readiness = await app.inject({ method: 'GET', url: '/readyz' });
  assert.equal(readiness.statusCode, 200);
  assert.deepEqual(readiness.json(), { ok: true, authProvider: false });
});

test('admin and client portal previews are separate and do not expose data APIs', async t => {
  const app = buildApp(config);
  t.after(() => app.close());

  const admin = await app.inject({ method: 'GET', url: '/admin' });
  assert.equal(admin.statusCode, 200);
  assert.match(admin.headers['content-type'] ?? '', /text\/html/);
  assert.match(admin.body, /STAFF WORKSPACE/);
  assert.match(admin.body, /This is a safe initial deployment/);
  assert.match(admin.body, /Content and availability/);
  assert.match(admin.body, /Viewing and lease applications/);

  const client = await app.inject({ method: 'GET', url: '/client' });
  assert.equal(client.statusCode, 200);
  assert.match(client.headers['content-type'] ?? '', /text\/html/);
  assert.match(client.body, /Client portal/);
  assert.match(client.body, /Approved renters will use this secure portal/);
  assert.doesNotMatch(client.body, /Secure renter sign-in is not configured yet/);

  const stylesheet = await app.inject({ method: 'GET', url: '/portal/portal.css' });
  assert.equal(stylesheet.statusCode, 200);
  assert.match(stylesheet.headers['content-type'] ?? '', /text\/css/);

  const unknownAsset = await app.inject({ method: 'GET', url: '/portal/unknown.txt' });
  assert.equal(unknownAsset.statusCode, 404);
});

test('production rejects public bootstrap and non-HTTPS password sign-in', async t => {
  const app = buildApp(loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://platform:password@localhost:5432/platform',
    RRC_PLATFORM_ORIGINS: 'https://rosefoodrealtycorp.com',
    RRC_AUTH_PROVIDER: 'local-password',
  }));
  t.after(() => app.close());

  const bootstrap = await app.inject({ method: 'GET', url: '/api/auth/bootstrap-status', remoteAddress: '127.0.0.1' });
  assert.equal(bootstrap.statusCode, 403);

  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'staff@example.com', password: 'safe-password-123' } });
  assert.equal(login.statusCode, 403);
});
