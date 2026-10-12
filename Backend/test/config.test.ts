import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

const base = {
  DATABASE_URL: 'postgresql://platform:password@localhost:5432/platform',
  RRC_PLATFORM_ORIGINS: 'http://127.0.0.1:4173',
};

test('loads a safe local development configuration', () => {
  const config = loadConfig(base);
  assert.equal(config.PORT, 4180);
  assert.equal(config.origins.has('http://127.0.0.1:4173'), true);
  assert.equal(config.RRC_AUTH_PROVIDER, 'unconfigured');
});

test('rejects origin values with paths', () => {
  assert.throws(() => loadConfig({ ...base, RRC_PLATFORM_ORIGINS: 'https://rrc.example.com/admin' }));
});
