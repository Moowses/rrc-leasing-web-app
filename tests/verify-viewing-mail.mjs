import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createViewingMailer, validateViewingRequest, loadViewingProperties, philippineToday, VIEWING_RECIPIENT, MAX_VIEWING_REQUEST_BYTES } from '../website/viewing-mail.mjs';
import { createPreviewServer } from '../website/server.mjs';

const properties = [
  { id: 'TEST-1', title: 'Approved test property', type: 'commercial', area: 'Test area', city: 'Test city', available: true },
  { id: 'CLOSED-1', title: 'Unavailable property', type: 'residential', area: 'Test area', city: 'Test city', available: false },
];
const payload = (extra = {}) => ({ propertyId: 'TEST-1', name: 'Synthetic Visitor', email: 'synthetic@example.test', phone: '', date: '2099-12-01', time: 'Flexible', message: '', ...extra });
const env = { RRC_VIEWING_SEND_ENABLED: 'true', RRC_SMTP_HOST: 'smtp.example.test', RRC_SMTP_PORT: '587', RRC_SMTP_USER: 'test@rosefoodrealtycorp.com', RRC_SMTP_PASSWORD: 'synthetic-not-a-password', RRC_SMTP_FROM: 'test@rosefoodrealtycorp.com' };

test('viewing sending requires its own opt-in and complete config; no connection on disabled/startup/status', async () => {
  let constructed = 0, sends = 0;
  const factory = () => { constructed++; return { sendMail: async () => { sends++; return { accepted: [VIEWING_RECIPIENT] }; } }; };
  for (const config of [{}, { ...env, RRC_VIEWING_SEND_ENABLED: 'false', RRC_RECRUITMENT_SEND_ENABLED: 'true' }, { ...env, RRC_SMTP_PASSWORD: '' }, { ...env, RRC_SMTP_PORT: '25' }, { ...env, RRC_SMTP_FROM: 'other@example.test' }]) {
    const mailer = await createViewingMailer({ env: config, properties, transportFactory: factory });
    assert.equal(mailer.enabled, false);
    await assert.rejects(mailer.send(payload()), error => error.status === 503 && error.message.includes('has not been sent'));
  }
  assert.equal(constructed, 0);
  const enabled = await createViewingMailer({ env, properties, transportFactory: factory });
  assert.equal(enabled.enabled, true); assert.equal(constructed, 1); assert.equal(sends, 0);
});

test('server resolves the property from the fixed owned catalog, not supplied title or recipient', async () => {
  const catalog = await loadViewingProperties();
  assert.ok(catalog.length > 0);
  const open = catalog.find(item => item.available === true);
  assert.ok(open);
  const viewing = validateViewingRequest(payload({ propertyId: open.id, propertyTitle: 'Forged title', to: 'other@example.test' }), catalog);
  assert.equal(viewing.property.title, open.title);
  assert.equal(Object.isFrozen(viewing.property), true);
  for (const propertyId of ['UNKNOWN', 'CLOSED-1', 'TEST-1\r\nBcc: other@example.test']) {
    assert.throws(() => validateViewingRequest(payload({ propertyId }), properties), error => error.status === 400);
  }
});

test('required contact/date/time fields, genuine calendar dates and Philippine date boundary are validated', () => {
  assert.equal(philippineToday(Date.parse('2026-09-29T15:59:59Z')), '2026-09-29');
  assert.equal(philippineToday(Date.parse('2026-09-29T16:00:00Z')), '2026-09-30');
  const now = { today: '2026-09-30' };
  for (const key of ['propertyId', 'name', 'email', 'date', 'time']) {
    for (const value of [undefined, null, '']) assert.throws(() => validateViewingRequest(payload({ [key]: value }), properties, now), error => error.status === 400);
  }
  for (const bad of [
    { date: '2026-09-29' }, { date: '2026-02-30' }, { date: '2027-02-29' }, { date: '2026-13-01' }, { date: '2026-9-30' }, { date: '2026-09-30T00:00:00Z' },
    { time: 'Night' }, { name: '\r\nVisitor' }, { email: 'visitor@example.test\r\n' }, { email: 'invalid' },
    { name: 'x'.repeat(121) }, { message: 'x'.repeat(1001) }, { phone: 'abcdefg' }, { phone: '-------' },
  ]) assert.throws(() => validateViewingRequest(payload(bad), properties, now), error => error.status === 400);
  for (const time of ['Morning', 'Afternoon', 'Flexible']) assert.equal(validateViewingRequest(payload({ date: '2026-09-30', time }), properties, now).time, time);
  const valid = validateViewingRequest(payload({ name: '  María Dela Peña  ', date: '2028-02-29', phone: '+63 917 000 0000', message: 'Line one\nLine two' }), properties, now);
  assert.equal(valid.name, 'María Dela Peña'); assert.equal(valid.date, '2028-02-29');
  assert.equal(validateViewingRequest(payload({ phone: undefined, message: undefined }), properties, now).phone, '');
});

test('mail is fixed to Leasing with approved property details and Reply-To; success does not confirm a booking', async () => {
  let options, message;
  const mailer = await createViewingMailer({ env, properties, transportFactory: settings => { options = settings; return { sendMail: async mail => { message = mail; return { accepted: [VIEWING_RECIPIENT] }; } }; } });
  const result = await mailer.send(payload({ to: 'other@example.test', from: 'other@example.test', propertyTitle: 'Forged', url: 'https://untrusted.example' }));
  assert.equal(result.sent, true); assert.match(result.message, /viewing is not confirmed/);
  assert.equal(message.to, 'leasing@rosefoodrealtycorp.com'); assert.equal(message.replyTo.address, 'synthetic@example.test'); assert.equal(message.from.address, env.RRC_SMTP_FROM);
  for (const text of ['Property ID: TEST-1', 'Property: Approved test property', 'Category: commercial', 'Area: Test area', 'City: Test city', 'Preferred date: 2099-12-01 (Philippine time)', 'Preferred time: Flexible']) assert.ok(message.text.includes(text));
  assert.ok(!message.text.includes('Forged')); assert.equal(message.attachments, undefined);
  assert.equal(options.requireTLS, true); assert.equal(options.tls.rejectUnauthorized, true); assert.equal(options.logger, false); assert.equal(options.debug, false);
  assert.equal(message.disableFileAccess, true); assert.equal(message.disableUrlAccess, true);
});

test('customer acknowledgement is opt-in, contains no attachment, and does not confirm a viewing', async () => {
  const messages = [];
  const mailer = await createViewingMailer({ env: { ...env, RRC_CUSTOMER_CONFIRMATION_ENABLED: 'true' }, properties, transportFactory: () => ({ sendMail: async mail => { messages.push(mail); return { accepted: [mail.to] }; } }) });
  const result = await mailer.send(payload());
  assert.equal(result.customerConfirmationSent, true);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, VIEWING_RECIPIENT);
  assert.equal(messages[1].to, 'synthetic@example.test');
  assert.equal(messages[1].attachments, undefined);
  assert.match(messages[1].text, /not a confirmed appointment/);
});

test('invalid data never sends; rejection and ambiguous SMTP failures return generic errors with contact guidance', async () => {
  let sends = 0;
  const validMailer = await createViewingMailer({ env, properties, transportFactory: () => ({ sendMail: async () => { sends++; return { accepted: [VIEWING_RECIPIENT] }; } }) });
  await assert.rejects(validMailer.send(payload({ propertyId: 'CLOSED-1' })), error => error.status === 400);
  assert.equal(sends, 0);
  for (const sendMail of [async () => ({ accepted: ['recruitment@rosefoodrealtycorp.com'] }), async () => { throw new Error('SMTP secret must stay private'); }]) {
    const mailer = await createViewingMailer({ env, properties, transportFactory: () => ({ sendMail }) });
    await assert.rejects(mailer.send(payload()), error => error.status === 502 && error.message.includes('before retrying') && !error.message.includes('secret'));
  }
});

async function localServer(t, viewingMailer, recruitmentMailer = { enabled: false }) {
  const server = await createPreviewServer({ viewingMailer, recruitmentMailer });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, body, extra = {}, route = '/api/viewing') => fetch(`${base}${route}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('HTTP disabled state is truthful and viewing server source is private', async t => {
  const base = await localServer(t, await createViewingMailer({ env: {} }));
  assert.deepEqual(await (await fetch(`${base}/api/viewing/status`)).json(), { enabled: false });
  const response = await post(base, payload());
  assert.equal(response.status, 503); const body = await response.json(); assert.equal(body.sent, false); assert.match(body.error, /has not been sent/);
  assert.equal((await fetch(`${base}/viewing-mail.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/api/viewing`)).status, 405);
});

test('HTTP enforces origin, Host, request type and schema before fake delivery', async t => {
  let sends = 0;
  const mailer = await createViewingMailer({ env, properties, transportFactory: () => ({ sendMail: async () => { sends++; return { accepted: [VIEWING_RECIPIENT] }; } }) });
  const base = await localServer(t, mailer);
  assert.deepEqual(await (await fetch(`${base}/api/viewing/status`)).json(), { enabled: true }); assert.equal(sends, 0);
  assert.equal((await post(base, payload(), { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await fetch(`${base}/api/viewing`, { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await post(base, payload(), { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post(base, '{')).status, 400);
  assert.equal((await post(base, payload({ propertyId: 'CLOSED-1' }))).status, 400);
  const accepted = await post(base, payload()); assert.equal(accepted.status, 200); assert.equal((await accepted.json()).sent, true); assert.equal(sends, 1);
  const hostStatus = await new Promise((resolve, reject) => {
    const request = http.get(`${base}/api/viewing/status`, { headers: { Host: 'untrusted.example' } }, response => { response.resume(); resolve(response.statusCode); }); request.on('error', reject);
  });
  assert.equal(hostStatus, 403);
});

test('HTTP has a small request cap and independent viewing/recruitment attempt limits', async t => {
  let sends = 0;
  const base = await localServer(t, { enabled: true, async send() { sends++; return { sent: true }; } });
  assert.equal((await post(base, 'x'.repeat(MAX_VIEWING_REQUEST_BYTES + 1))).status, 413);
  for (let attempt = 0; attempt < 4; attempt++) assert.equal((await post(base, '{')).status, 400);
  assert.equal((await post(base, payload())).status, 429); assert.equal(sends, 0);
  assert.equal((await post(base, {}, {}, '/api/recruitment')).status, 503);
});

test('HTTP limits simultaneous viewing requests independently', async t => {
  let entered = 0, release, allEntered;
  const gate = new Promise(resolve => { release = resolve; });
  const enteredGate = new Promise(resolve => { allEntered = resolve; });
  const base = await localServer(t, { enabled: true, async send() { entered++; if (entered === 4) allEntered(); await gate; return { sent: true }; } });
  const pending = Array.from({ length: 4 }, () => post(base, payload()));
  try {
    await enteredGate;
    const limited = await post(base, payload()); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal((await post(base, {}, {}, '/api/recruitment')).status, 503);
  } finally { release(); }
  for (const response of await Promise.all(pending)) assert.equal(response.status, 200);
});
