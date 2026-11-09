import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

// Use a newly migrated, disposable database, never the deployed database.
const url = new URL(process.env.RRC_GALLERY_TEST_DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
assert.match(url.pathname, /^\/rrc_gallery_test_[a-z0-9]+$/);
assert.equal(url.search, '', 'The fixture must not select an alternate database schema.');
assert.notEqual(process.env.NODE_ENV, 'production');
process.env.DATABASE_URL = url.toString();
process.env.RRC_OPERATIONAL_EMAIL_ENABLED = 'false';
const { buildApp } = await import('../dist/app.js');
const { loadConfig } = await import('../dist/config.js');
const app = buildApp(loadConfig({
  NODE_ENV: 'test', DATABASE_URL: url.toString(), RRC_PLATFORM_ORIGINS: 'http://127.0.0.1:4191',
  RRC_AUTH_PROVIDER: 'local-password',
}));
const db = new PrismaClient();
const reference = 'C-001';
const email = 'gallery-test@example.invalid';
const password = 'Gallery-Test-Only-2026!';
const listingPath = `/api/admin/properties/${reference}`;
const publicPath = `/api/public/properties/${reference}`;
const asset = name => readFile(new URL(`../public/brand/${name}`, import.meta.url));

try {
  assert.equal(await db.staffUser.count(), 0, 'Use a fresh fixture database.');
  assert.equal(await db.property.count(), 0, 'Use a fresh fixture database.');
  const account = await app.inject({ method: 'POST', url: '/api/auth/bootstrap', payload: { email, password, displayName: 'Gallery test' } });
  assert.equal(account.statusCode, 200);
  const cookie = account.headers['set-cookie'].split(';')[0];
  const headers = { cookie };
  const cover = await asset('sample-commercial.jpg');
  const gallery = await asset('sample-interior.jpg');
  const details = {
    reference, name: 'Tagum leasing fixture', unitName: '00010', type: 'COMMERCIAL', listingKind: 'Retail',
    floorLabel: 'Ground floor', address: 'Private fixture address', area: 'TAGUM-10', city: 'TAGUM CITY',
    floorAreaSqm: 40.7, monthlyRent: 25000, availability: 'AVAILABLE', publish: true, imageAlt: 'C-001 cover',
  };
  const created = await app.inject({ method: 'POST', url: '/api/admin/properties', headers, payload: {
    ...details, imageData: cover.toString('base64'), imageType: 'image/jpeg',
  } });
  assert.equal(created.statusCode, 200, created.body);
  const originalCover = created.json().cover;
  const updated = await app.inject({ method: 'PUT', url: listingPath, headers, payload: details });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().cover.id, originalCover.id);
  const upload = { uploadId: randomUUID(), imageData: gallery.toString('base64'), imageType: 'image/jpeg', imageAlt: 'C-001 interior' };
  const uploadPath = `${listingPath}/images`;
  const invalid = await app.inject({ method: 'POST', url: uploadPath, headers, payload: { ...upload, imageType: 'image/png' } });
  assert.equal(invalid.statusCode, 400);
  const first = await app.inject({ method: 'POST', url: uploadPath, headers, payload: upload });
  assert.equal(first.statusCode, 200, first.body);
  const saved = first.json().image;
  assert.equal(saved.isCover, false);
  const retry = await app.inject({ method: 'POST', url: uploadPath, headers, payload: upload });
  assert.equal(retry.json().image.id, saved.id, 'Retry must not duplicate the photo.');

  const reloaded = await app.inject({ method: 'GET', url: '/api/admin/properties', headers });
  const [item] = reloaded.json();
  assert.equal(item.id, reference);
  assert.equal(item.address, details.address);
  assert.deepEqual(item.images.map(photo => photo.id), [originalCover.id, saved.id]);
  assert.equal(item.images[0].isCover, true);
  assert.equal(item.images[1].url, `/api/admin/property-images/${saved.id}`);
  assert.equal((await app.inject({ method: 'GET', url: saved.url })).statusCode, 401);
  const preview = await app.inject({ method: 'GET', url: saved.url, headers });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.headers['cache-control'], 'private, no-store');
  assert.deepEqual(preview.rawPayload, gallery);
  const publicDetails = await app.inject({ method: 'GET', url: publicPath });
  assert.equal(publicDetails.statusCode, 200);
  assert.equal(publicDetails.json().address, undefined);
  assert.deepEqual(publicDetails.json().images.map(photo => photo.id), [originalCover.id, saved.id]);
  const publicPhotoPath = publicDetails.json().images[1].url;
  assert.deepEqual((await app.inject({ method: 'GET', url: publicPhotoPath })).rawPayload, gallery);
  assert.deepEqual(Buffer.from((await db.propertyImage.findUniqueOrThrow({ where: { id: saved.id } })).data), gallery);
  assert.equal(await db.auditEvent.count({ where: { action: 'LISTING_IMAGE_ADDED' } }), 1);

  const statusPath = `${listingPath}/status`;
  assert.equal((await app.inject({ method: 'PATCH', url: statusPath, headers, payload: { status: 'UNPUBLISHED' } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: publicPath })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: publicPhotoPath })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: saved.url, headers })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PATCH', url: statusPath, headers, payload: { status: 'PUBLISHED' } })).statusCode, 200);
  console.log('C-001 fixture passed: cover preserved, gallery bytes persisted and reloaded, retry deduplicated, and unpublished photos protected.');

  if (process.argv.includes('--serve')) {
    await app.listen({ host: '127.0.0.1', port: 4180 });
    console.log('Fixture API listening at http://127.0.0.1:4180 for browser testing.');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }
} finally {
  await app.close();
  await db.$disconnect();
}
