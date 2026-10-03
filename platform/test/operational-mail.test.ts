import assert from 'node:assert/strict';
import test from 'node:test';
import { createOperationalMailer } from '../src/operational-mail.js';
import type { PlatformConfig } from '../src/config.js';

const config: PlatformConfig = {
  NODE_ENV: 'test', PORT: 4180, DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/rrc',
  RRC_PLATFORM_ORIGINS: 'https://rosefoodrealtycorp.com', origins: new Set(['https://rosefoodrealtycorp.com']), primaryOrigin: 'https://rosefoodrealtycorp.com',
  RRC_AUTH_PROVIDER: 'local-password', RRC_OPERATIONAL_EMAIL_ENABLED: 'true', RRC_LEASING_RECIPIENT: 'leasing@rosefoodrealtycorp.com',
  RRC_SMTP_HOST: 'smtp.example.test', RRC_SMTP_PORT: 465, RRC_SMTP_USERNAME: 'leasing@example.test', RRC_SMTP_PASSWORD: 'not-a-real-password', RRC_SMTP_FROM_ADDRESS: 'leasing@example.test', RRC_SMTP_FROM_NAME: 'Rosefood Realty Corporation',
};

test('operational mail addresses staff, applicant review, and private resubmission flows', async () => {
  const sent: any[] = [];
  const transport = { sendMail: async (message: any) => { sent.push(message); return { accepted: [message.to] }; } } as any;
  const mailer = createOperationalMailer(config, transport);
  const request = { type: 'APPLICATION' as const, reference: 'C-101', propertyName: 'Bajada Commercial Centre', contactName: 'Applicant Example', email: 'applicant@example.test', phone: '09171234567', notes: 'Please review.' };
  const initial = await mailer.initial(request);
  const review = await mailer.reviewing(request);
  const resubmission = await mailer.resubmission(request, 'https://rosefoodrealtycorp.com/resubmit/private-token', ['Government-issued ID'], new Date('2026-10-04T01:00:00.000Z'));
  assert.deepEqual(initial, { enabled: true, staffAccepted: true, customerAccepted: true });
  assert.equal(review.accepted, true);
  assert.equal(resubmission.accepted, true);
  assert.equal(sent[0].to, 'leasing@rosefoodrealtycorp.com');
  assert.match(sent[1].subject, /received/i);
  assert.match(sent[2].text, /now reviewing/i);
  assert.match(sent[3].text, /private-token/);
});

test('operational mail stays inactive until explicitly enabled and configured', async () => {
  const mailer = createOperationalMailer({ ...config, RRC_OPERATIONAL_EMAIL_ENABLED: 'false' });
  const result = await mailer.reviewing({ type: 'VIEWING', reference: 'R-201', propertyName: 'Matina Residences', contactName: 'Applicant Example', email: 'applicant@example.test' });
  assert.equal(mailer.enabled, false);
  assert.deepEqual(result, { enabled: false, accepted: false });
});
