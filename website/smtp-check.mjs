import nodemailer from 'nodemailer';

const env = process.env;
const host = (env.RRC_SMTP_HOST || env.MAIL_HOST || '').trim();
const port = Number(env.RRC_SMTP_PORT || env.MAIL_PORT);
const user = (env.RRC_SMTP_USER || env.MAIL_USERNAME || '').trim();
const password = env.RRC_SMTP_PASSWORD || env.MAIL_PASSWORD || '';
const from = (env.RRC_SMTP_FROM || env.MAIL_FROM_ADDRESS || '').trim();

if (!host || ![465, 587].includes(port) || !user || !password || !from) {
  console.error('[smtp-check] SMTP configuration is incomplete. No connection was attempted.');
  process.exitCode = 1;
} else {
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user, pass: password },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    logger: false,
    debug: false,
  });
  try {
    await transport.verify();
    console.log('[smtp-check] Zoho SMTP connection and authentication succeeded. No email was sent.');
  } catch (error) {
    const code = error?.code || 'UNKNOWN';
    const responseCode = error?.responseCode ? ` / SMTP ${error.responseCode}` : '';
    const command = error?.command ? ` during ${error.command}` : '';
    console.error(`[smtp-check] Verification failed: ${code}${responseCode}${command}. No email was sent.`);
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
