import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ApplicationError } from './recruitment-mail.mjs';

export const VIEWING_RECIPIENT = 'leasing@rosefoodrealtycorp.com';
export const MAX_VIEWING_REQUEST_BYTES = 32 * 1024;
const VIEWING_TIMES = new Set(['Morning', 'Afternoon', 'Flexible']);
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const isEmail = value => typeof value === 'string' && value.length <= 254 && emailPattern.test(value);
const fail = message => { throw new ApplicationError(400, message); };

function textField(value, label, limit, required = true, multiline = false) {
  if (typeof value !== 'string') fail(`${label} must be text.`);
  const result = value.trim();
  if ((required && !result) || result.length > limit || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) {
    fail(`Please enter a valid ${label.toLowerCase()} (${limit} characters maximum).`);
  }
  return result;
}

export const philippineToday = (now = Date.now()) => new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function loadViewingProperties() {
  // This is the fixed, application-owned catalog, never code or a path from a request.
  // The VM is used to read the existing browser data format, not to run untrusted uploads.
  const source = await readFile(new URL('./properties.js', import.meta.url), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  if (!Array.isArray(context.window.RRCProperties)) throw new Error('The property catalog could not be loaded.');
  const ids = new Set();
  return Array.from(context.window.RRCProperties, property => {
    const record = {};
    for (const field of ['id', 'title', 'type', 'area', 'city']) {
      if (typeof property?.[field] !== 'string' || !property[field].trim() || property[field].length > 200 || /[\u0000-\u001f\u007f]/.test(property[field])) {
        throw new Error('The property catalog contains an invalid record.');
      }
      record[field] = property[field];
    }
    if (ids.has(record.id) || !['commercial', 'residential'].includes(record.type)) throw new Error('The property catalog contains an invalid record.');
    ids.add(record.id);
    record.available = property.available === true;
    return Object.freeze(record);
  });
}

export function validateViewingRequest(payload, properties, { today = philippineToday() } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Please complete the viewing request.');
  const propertyId = textField(payload.propertyId, 'Property ID', 60);
  const property = properties.find(item => item.id === propertyId && item.available === true);
  if (!property) fail('This property is not available for a viewing request. Please choose an available listing.');
  const name = textField(payload.name, 'Name', 120);
  const email = textField(payload.email, 'Email address', 254);
  const phone = textField(payload.phone ?? '', 'Phone number', 30, false);
  const message = textField(payload.message ?? '', 'Message', 1000, false, true);
  if (!isEmail(email)) fail('Enter a valid email address.');
  if (phone && (!/^[+()\d .-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7)) fail('Enter a valid contact number.');
  if (typeof payload.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) fail('Choose a valid preferred viewing date.');
  const [year, month, day] = payload.date.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || payload.date < today) {
    fail('Choose today or a future viewing date in Philippine time.');
  }
  if (!VIEWING_TIMES.has(payload.time)) fail('Choose Morning, Afternoon or Flexible for your preferred viewing time.');
  return { property, name, email, phone, date: payload.date, time: payload.time, message };
}

function configuration(env) {
  if (env.RRC_VIEWING_SEND_ENABLED !== 'true') return null;
  const host = env.RRC_SMTP_HOST?.trim();
  const user = env.RRC_SMTP_USER?.trim();
  const pass = env.RRC_SMTP_PASSWORD;
  const from = env.RRC_SMTP_FROM?.trim();
  const port = Number(env.RRC_SMTP_PORT);
  if (!host || !/^[A-Za-z0-9.-]+$/.test(host) || ![465, 587].includes(port) || !isEmail(user) || !pass || !isEmail(from) || !from.toLowerCase().endsWith('@rosefoodrealtycorp.com')) return null;
  return { host, port, user, pass, from };
}

export async function createViewingMailer({ env = process.env, transportFactory, properties } = {}) {
  const unavailable = {
    enabled: false,
    async send() { throw new ApplicationError(503, 'Online viewing requests are not connected to Leasing yet. Your request has not been sent. Please email leasing@rosefoodrealtycorp.com.'); },
  };
  const config = configuration(env);
  if (!config) return unavailable;
  const catalog = properties || await loadViewingProperties();
  if (!transportFactory) {
    try {
      const { default: nodemailer } = await import('nodemailer');
      transportFactory = options => nodemailer.createTransport(options);
    } catch { return unavailable; }
  }
  const transport = transportFactory({
    host: config.host, port: config.port, secure: config.port === 465, requireTLS: true,
    auth: { user: config.user, pass: config.pass },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 30000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  });
  return {
    enabled: true,
    async send(payload) {
      const viewing = validateViewingRequest(payload, catalog);
      const mail = {
        from: { name: 'RRC Leasing', address: config.from },
        to: VIEWING_RECIPIENT,
        replyTo: { name: viewing.name, address: viewing.email },
        subject: `RRC viewing request: ${viewing.property.id} - ${viewing.name}`,
        text: [
          'New property viewing request from the RRC website', '',
          `Property ID: ${viewing.property.id}`, `Property: ${viewing.property.title}`,
          `Category: ${viewing.property.type}`, `Area: ${viewing.property.area}`, `City: ${viewing.property.city}`, '',
          `Name: ${viewing.name}`, `Email: ${viewing.email}`, `Phone: ${viewing.phone || '(Not supplied)'}`,
          `Preferred date: ${viewing.date} (Philippine time)`, `Preferred time: ${viewing.time}`, '',
          'Message:', viewing.message || '(No message supplied)', '',
          'This is a request only. The viewing is not confirmed. Please contact the applicant to agree a schedule.',
        ].join('\n'),
        disableFileAccess: true, disableUrlAccess: true,
      };
      try {
        const result = await transport.sendMail(mail);
        if (!result.accepted?.some(address => String(address).toLowerCase() === VIEWING_RECIPIENT)) throw new Error('Recipient not accepted');
        return { sent: true, message: 'Your viewing request has been accepted by the mail service for delivery to Leasing. The viewing is not confirmed; our team will contact you.' };
      } catch {
        throw new ApplicationError(502, 'We could not confirm email delivery. Please contact leasing@rosefoodrealtycorp.com before retrying to avoid a duplicate request.');
      }
    },
  };
}
