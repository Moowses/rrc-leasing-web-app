import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRecruitmentMailer, validateApplication, RECRUITMENT_POSITIONS, RECRUITMENT_RECIPIENT, MAX_RESUME_BYTES, MAX_REQUEST_BYTES } from '../website/recruitment-mail.mjs';
import { createPreviewServer } from '../website/server.mjs';

const pdf = Buffer.from('%PDF-1.4\nSynthetic resume for local unit tests only\n%%EOF\n');
const payload = (extra = {}) => ({ position: 'Project Engineer', firstName: 'Synthetic', lastName: 'Applicant', email: 'synthetic@example.test', phone: '', message: '', consent: true, resume: { name: 'synthetic-resume.pdf', type: 'application/pdf', dataBase64: pdf.toString('base64') }, ...extra });
const env = { RRC_RECRUITMENT_SEND_ENABLED: 'true', RRC_SMTP_HOST: 'smtp.example.test', RRC_SMTP_PORT: '587', RRC_SMTP_USER: 'test@rosefoodrealtycorp.com', RRC_SMTP_PASSWORD: 'synthetic-not-a-password', RRC_SMTP_FROM: 'test@rosefoodrealtycorp.com' };

test('disabled and incomplete configuration never construct or contact a transport', async () => {
  let called = false;
  for (const config of [{}, { ...env, RRC_RECRUITMENT_SEND_ENABLED: 'false' }, { ...env, RRC_SMTP_PASSWORD: '' }, { ...env, RRC_SMTP_FROM: 'other@example.test' }, { ...env, RRC_SMTP_PORT: '25' }]) {
    const mailer = await createRecruitmentMailer({ env: config, transportFactory: () => { called = true; } });
    assert.equal(mailer.enabled, false);
    await assert.rejects(mailer.send(payload()), error => error.status === 503 && error.message.includes('has not been sent'));
  }
  assert.equal(called, false);
});

test('all approved roles, optional phone/message, and exact 5 MiB PDF are accepted locally', () => {
  for (const position of RECRUITMENT_POSITIONS) assert.equal(validateApplication(payload({ position })).position, position);
  const largePdf = Buffer.alloc(MAX_RESUME_BYTES, 32);
  largePdf.write('%PDF-1.7\n', 0);
  largePdf.write('\n%%EOF', largePdf.length - 6);
  assert.equal(validateApplication(payload({ resume: { name: 'maximum.pdf', type: 'application/pdf', dataBase64: largePdf.toString('base64') } })).resume.content.length, MAX_RESUME_BYTES);
  assert.equal(validateApplication(payload({ phone: undefined, message: undefined })).phone, '');
});

test('first name, last name, email and resume are individually required; Unicode names retain their spelling', () => {
  for (const key of ['firstName', 'lastName', 'email', 'resume']) {
    for (const value of [undefined, null, '']) {
      assert.throws(() => validateApplication(payload({ [key]: value })), error => error.status === 400, `${key} must be present`);
    }
  }
  for (const bad of [
    { firstName: '   ' }, { lastName: '   ' }, { email: '   ' }, { email: 'not-an-email' },
    { firstName: 'a'.repeat(61) }, { lastName: 'a'.repeat(61) },
    { firstName: undefined, lastName: undefined, name: 'Legacy Full Name' },
  ]) assert.throws(() => validateApplication(payload(bad)), error => error.status === 400);
  const application = validateApplication(payload({ firstName: '  María José  ', lastName: "  Dela Peña-O'Neil  " }));
  assert.equal(application.firstName, 'María José');
  assert.equal(application.lastName, "Dela Peña-O'Neil");
  assert.equal(application.name, "María José Dela Peña-O'Neil");
  assert.equal(validateApplication(payload({ firstName: 'a'.repeat(60), lastName: 'b'.repeat(60) })).name.length, 121);
});

test('validation rejects header injection, unknown vacancy, missing consent, executable and malformed uploads', () => {
  for (const bad of [
    { firstName: 'Name\r\nBcc: other@example.test' }, { lastName: 'Name\r\nBcc: other@example.test' },
    { firstName: '\r\nName' }, { lastName: 'Name\r\n' }, { email: 'bad\n@example.test' }, { phone: 'not a phone' },
    { position: 'Maintenance Coordinator' }, { consent: false }, { message: 'x'.repeat(3001) },
    { resume: { name: '../resume.pdf', dataBase64: pdf.toString('base64') } },
    { resume: { name: 'resume.exe', dataBase64: pdf.toString('base64') } },
    { resume: { name: 'resume.docx', dataBase64: pdf.toString('base64') } },
    { resume: { name: 'resume.pdf', type: 'application/msword', dataBase64: pdf.toString('base64') } },
    { resume: { name: 'resume.pdf', dataBase64: 'ab=c' } },
    { resume: { name: 'resume.pdf', dataBase64: Buffer.from('Not actually a PDF').toString('base64') } },
    { resume: { name: 'resume.pdf', dataBase64: Buffer.alloc(MAX_RESUME_BYTES + 1).toString('base64') } },
  ]) assert.throws(() => validateApplication(payload(bad)), error => error.status === 400);
});

test('a .doc must have Word compound-file markers; DOCX requires a Word ZIP container', () => {
  const doc = Buffer.alloc(512);
  Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(doc);
  Buffer.from('WordDocument', 'utf16le').copy(doc, 128);
  assert.equal(validateApplication(payload({ resume: { name: 'synthetic.doc', type: 'application/msword', dataBase64: doc.toString('base64') } })).resume.contentType, 'application/msword');
  const entries = ['[Content_Types].xml', 'word/document.xml'];
  const locals = [], central = [];
  let localOffset = 0;
  for (const name of entries) {
    const filename = Buffer.from(name);
    const local = Buffer.alloc(30 + filename.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(filename.length, 26); filename.copy(local, 30);
    const index = Buffer.alloc(46 + filename.length);
    index.writeUInt32LE(0x02014b50, 0); index.writeUInt16LE(filename.length, 28); index.writeUInt32LE(localOffset, 42); filename.copy(index, 46);
    locals.push(local); central.push(index); localOffset += local.length;
  }
  const indexes = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(2, 8); end.writeUInt16LE(2, 10); end.writeUInt32LE(indexes.length, 12); end.writeUInt32LE(localOffset, 16);
  const docx = Buffer.concat([...locals, indexes, end]);
  assert.equal(validateApplication(payload({ resume: { name: 'synthetic.docx', dataBase64: docx.toString('base64') } })).resume.contentType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  docx.writeUInt16LE(1, localOffset + 8);
  assert.throws(() => validateApplication(payload({ resume: { name: 'encrypted.docx', dataBase64: docx.toString('base64') } })), error => error.status === 400);
});

test('message goes only to HR with resume bytes and applicant Reply-To; success requires recipient acceptance', async () => {
  let options, message;
  const mailer = await createRecruitmentMailer({ env, transportFactory: settings => { options = settings; return { sendMail: async mail => { message = mail; return { accepted: [RECRUITMENT_RECIPIENT] }; } }; } });
  assert.equal(mailer.enabled, true);
  const result = await mailer.send(payload({ to: 'attacker@example.test', from: 'attacker@example.test' }));
  assert.equal(result.sent, true);
  assert.equal(options.requireTLS, true); assert.equal(options.secure, false); assert.equal(options.debug, false);
  assert.equal(message.to, RECRUITMENT_RECIPIENT); assert.equal(message.from.address, env.RRC_SMTP_FROM);
  assert.equal(message.replyTo.address, 'synthetic@example.test'); assert.deepEqual(message.attachments[0].content, pdf);
  assert.equal(message.replyTo.name, 'Synthetic Applicant');
  assert.equal(message.subject, 'RRC job application: Project Engineer - Synthetic Applicant');
  assert.match(message.text, /^First name: Synthetic$/m); assert.match(message.text, /^Last name: Applicant$/m);
  assert.equal(message.disableFileAccess, true); assert.equal(message.disableUrlAccess, true);
  for (const transportResult of [async () => ({ accepted: [], rejected: [RECRUITMENT_RECIPIENT] }), async () => { throw new Error('private SMTP credentials must not leak'); }]) {
    const rejected = await createRecruitmentMailer({ env, transportFactory: () => ({ sendMail: transportResult }) });
    await assert.rejects(rejected.send(payload()), error => error.status === 502 && error.message.includes('could not confirm') && !error.message.includes('credentials'));
  }
});

async function localServer(t, recruitmentMailer) {
  const server = await createPreviewServer({ recruitmentMailer });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, body, extra = {}) => fetch(`${base}/api/recruitment`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('HTTP disabled status is honest and public files cannot expose server, setup or secrets', async t => {
  const base = await localServer(t, await createRecruitmentMailer({ env: {} }));
  assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { ok: true });
  assert.deepEqual(await (await fetch(`${base}/api/recruitment/status`)).json(), { enabled: false });
  const disabled = await post(base, payload());
  assert.equal(disabled.status, 503); assert.equal((await disabled.json()).sent, false);
  for (const file of ['server.mjs', 'recruitment-mail.mjs', 'EMAIL-SETUP.md', 'package.json', '.env']) assert.equal((await fetch(`${base}/${file}`)).status, 404);
  assert.equal((await fetch(`${base}/index.html`)).status, 200);
});

test('configured production origins are exact and preserve host/origin protection', async t => {
  const env = { RRC_PUBLIC_ORIGINS: 'https://www.example.com, https://staging.example.com' };
  const server = await createPreviewServer({ env, recruitmentMailer: { enabled: false }, viewingMailer: { enabled: false } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (origin, host = 'www.example.com') => new Promise((resolve, reject) => {
    const request = http.request(`${base}/api/recruitment`, { method: 'POST', headers: { Host: host, Origin: origin, 'Content-Type': 'application/json' } }, response => { response.resume(); resolve(response); });
    request.on('error', reject); request.end('{}');
  });
  assert.equal((await request('https://www.example.com')).statusCode, 503);
  assert.equal((await request('https://evil.example.com')).statusCode, 403);
  assert.equal((await request('https://www.example.com', 'evil.example.com')).statusCode, 403);
  const health = await new Promise((resolve, reject) => {
    const request = http.get(`${base}/healthz`, { headers: { Host: 'www.example.com' } }, response => { response.resume(); resolve(response); });
    request.on('error', reject);
  });
  assert.equal(health.statusCode, 200);
});

test('HTTP rejects external/missing origins, malformed JSON, wrong type; valid request reaches only fake transport', async t => {
  let sends = 0;
  const mailer = await createRecruitmentMailer({ env, transportFactory: () => ({ sendMail: async () => { sends++; return { accepted: [RECRUITMENT_RECIPIENT] }; } }) });
  const base = await localServer(t, mailer);
  assert.deepEqual(await (await fetch(`${base}/api/recruitment/status`)).json(), { enabled: true });
  assert.equal((await post(base, payload(), { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await fetch(`${base}/api/recruitment`, { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await post(base, '{')).status, 400);
  assert.equal((await post(base, payload(), { 'Content-Type': 'text/plain' })).status, 415);
  const accepted = await post(base, payload());
  assert.equal(accepted.status, 200); assert.equal((await accepted.json()).sent, true); assert.equal(sends, 1);
});

test('HTTP rejects missing separate names, email and resume before the fake transport sends', async t => {
  let sends = 0;
  const mailer = await createRecruitmentMailer({ env, transportFactory: () => ({ sendMail: async () => { sends++; return { accepted: [RECRUITMENT_RECIPIENT] }; } }) });
  const base = await localServer(t, mailer);
  for (const key of ['firstName', 'lastName', 'email', 'resume']) {
    const response = await post(base, payload({ [key]: undefined }));
    assert.equal(response.status, 400); assert.equal((await response.json()).sent, false);
  }
  assert.equal(sends, 0);
});

test('HTTP enforces request size and attempt limits without sending email', async t => {
  let sends = 0;
  const base = await localServer(t, { enabled: true, async send() { sends++; return { sent: true }; } });
  assert.equal((await post(base, 'x'.repeat(MAX_REQUEST_BYTES + 1))).status, 413);
  for (let attempt = 0; attempt < 4; attempt++) assert.equal((await post(base, '{')).status, 400);
  assert.equal((await post(base, '{}')).status, 429);
  assert.equal(sends, 0);
});

test('HTTP continues rejecting DNS-rebinding hosts', async t => {
  const base = await localServer(t, { enabled: false });
  const status = await new Promise((resolve, reject) => {
    const request = http.get(`${base}/api/recruitment/status`, { headers: { Host: 'untrusted.example' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
  });
  assert.equal(status, 403);
});
