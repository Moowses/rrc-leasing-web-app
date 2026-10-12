import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { cp, copyFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(backendDir, 'prisma', 'schema.prisma');
const cli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
const sourceUrl = new URL(process.env.DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1'].includes(sourceUrl.hostname), 'Use a local development PostgreSQL server.');
assert.notEqual(process.env.NODE_ENV, 'production', 'Do not run this fixture with production configuration.');
const databaseName = `rrc_release_verify_${randomBytes(6).toString('hex')}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
const administrator = new PrismaClient();
const fixture = new PrismaClient({ datasourceUrl: targetUrl.toString() });
let created = false;
let temporaryDir;

function prisma(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: targetUrl.toString() },
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout || 'Prisma command failed.');
}

try {
  await administrator.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  created = true;
  temporaryDir = await mkdtemp(path.join(tmpdir(), 'rrc-release-migrations-'));
  await copyFile(schema, path.join(temporaryDir, 'schema.prisma'));
  const migrations = path.join(backendDir, 'prisma', 'migrations');
  const baselineMigrations = (await readdir(migrations, { withFileTypes: true })).filter(entry => entry.isDirectory() && entry.name < '20261007090000_operations_mvp');
  assert.equal(baselineMigrations.length, 6, 'Preserve the six previously deployed migrations.');
  for (const migration of baselineMigrations) await cp(path.join(migrations, migration.name), path.join(temporaryDir, 'migrations', migration.name), { recursive: true });
  await copyFile(path.join(migrations, 'migration_lock.toml'), path.join(temporaryDir, 'migrations', 'migration_lock.toml'));
  prisma(['migrate', 'deploy', '--schema', path.join(temporaryDir, 'schema.prisma')]);

  const area = await fixture.area.create({ data: { name: 'Release fixture area', city: 'Test city' } });
  await fixture.$executeRawUnsafe('INSERT INTO "Property" ("id","reference","name","type","address","areaId","isPublished","createdAt","updatedAt") VALUES ($1,$2,$3,\'COMMERCIAL\',$4,$5,true,NOW(),NOW())', 'release-fixture-property', 'C-998', 'Release fixture', 'Test address', area.id);
  const staff = await fixture.staffUser.create({ data: { email: 'release-fixture@example.invalid', displayName: 'Release fixture', role: 'SUPER_ADMIN', status: 'ACTIVE', passwordHash: 'fixture-storage-check' } });
  await fixture.$executeRawUnsafe('INSERT INTO "ApplicationUploadDraft" ("id","tokenHash","propertyId","expiresAt") VALUES ($1,$2,$3,NOW()+INTERVAL \'1 hour\')', 'release-fixture-draft', 'fixture-token-hash', 'release-fixture-property');

  prisma(['migrate', 'deploy', '--schema', schema]);
  const property = await fixture.property.findUniqueOrThrow({ where: { id: 'release-fixture-property' } });
  assert.equal(property.status, 'PUBLISHED');
  assert.equal(property.isPublished, true);
  assert.equal((await fixture.staffUser.findUniqueOrThrow({ where: { id: staff.id } })).passwordHash, 'fixture-storage-check');
  assert.equal(await fixture.applicationUploadDraft.count(), 1);
  prisma(['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code']);
  console.log('Upgrade verified: six historical migrations, published listing, staff password hash, upload draft, and final schema preserved.');
} finally {
  await fixture.$disconnect();
  if (created) await administrator.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
  await administrator.$disconnect();
  if (temporaryDir) {
    const target = path.resolve(temporaryDir);
    assert.ok(target.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(target).startsWith('rrc-release-migrations-'), 'Refuse cleanup outside the fixture directory.');
    await rm(target, { recursive: true, force: true });
  }
}
