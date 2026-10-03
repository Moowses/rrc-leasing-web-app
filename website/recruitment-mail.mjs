export const RECRUITMENT_RECIPIENT = 'recruitment@rosefoodrealtycorp.com';
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
export const RECRUITMENT_POSITIONS = Object.freeze([
  'Project Engineer', 'Collections Officer', 'Design Architect', 'Maintenance Head',
  'Fabrication Head', 'Leasing Supervisor', 'Leasing Coordinator', 'Finance Head', 'Accounting Staff',
]);

export class ApplicationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

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

// Container/signature checks reject renamed files; these are not malware scanning.
function isDocx(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) return false;
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50 && offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length) { end = offset; break; }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) return false;
  const count = buffer.readUInt16LE(end + 10);
  const size = buffer.readUInt32LE(end + 12);
  let offset = buffer.readUInt32LE(end + 16);
  if (!count || count > 2000 || offset + size !== end) return false;
  const names = new Set();
  let inflated = 0;
  for (let entry = 0; entry < count; entry++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50 || buffer.readUInt16LE(offset + 8) & 1) return false;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const entryEnd = offset + 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    if (entryEnd > end || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) return false;
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name.includes('..') || name.startsWith('/') || name.includes('\\') || /vbaProject\.bin$/i.test(name)) return false;
    inflated += buffer.readUInt32LE(offset + 24);
    if (inflated > 25 * 1024 * 1024) return false;
    names.add(name);
    offset = entryEnd;
  }
  return offset === end && names.has('[Content_Types].xml') && names.has('word/document.xml');
}

function validateResume(resume) {
  if (!resume || typeof resume !== 'object' || Array.isArray(resume)) fail('Attach your resume as a PDF, DOC or DOCX file.');
  const name = textField(resume.name, 'Resume filename', 160);
  if (/[\\/:<>"|?*]/.test(name) || name.startsWith('.')) fail('Please use a simple resume filename without folders or special characters.');
  const extension = name.split('.').pop().toLowerCase();
  const types = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  if (!types[extension]) fail('Use a PDF, DOC or DOCX resume.');
  if (resume.type && resume.type !== types[extension] && resume.type !== 'application/octet-stream') fail('The resume type does not match its filename.');
  const encoded = resume.dataBase64;
  if (typeof encoded !== 'string' || !encoded || encoded.length > Math.ceil(MAX_RESUME_BYTES / 3) * 4) fail('The resume must be no larger than 5 MB.');
  if (encoded.length % 4 || /[^A-Za-z0-9+/=]/.test(encoded) || encoded.slice(0, -2).includes('=')) fail('The resume could not be read. Please attach it again.');
  const content = Buffer.from(encoded, 'base64');
  if (!content.length || content.length > MAX_RESUME_BYTES || content.toString('base64') !== encoded) fail('The resume must be a valid file no larger than 5 MB.');
  const valid = extension === 'pdf' ? /^%PDF-1\.[0-9]|^%PDF-2\.0/.test(content.toString('ascii', 0, 8)) && content.subarray(-2048).includes(Buffer.from('%%EOF'))
    : extension === 'doc' ? content.length >= 512 && content.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex')) && content.includes(Buffer.from('WordDocument', 'utf16le'))
    : isDocx(content);
  if (!valid) fail('The file does not appear to be a valid PDF, DOC or DOCX resume. Please export it again.');
  return { filename: name, contentType: types[extension], content, contentDisposition: 'attachment' };
}

export function validateApplication(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Please complete the application form.');
  if (!RECRUITMENT_POSITIONS.includes(payload.position)) fail('Choose one of the listed vacancies.');
  if (payload.consent !== true) fail('Please confirm your consent to send this application to RRC recruitment.');
  const firstName = textField(payload.firstName, 'First name', 60);
  const lastName = textField(payload.lastName, 'Last name', 60);
  const name = `${firstName} ${lastName}`;
  const email = textField(payload.email, 'Email address', 254);
  const phone = textField(payload.phone ?? '', 'Phone number', 30, false);
  const message = textField(payload.message ?? '', 'Message', 3000, false, true);
  if (!isEmail(email)) fail('Enter a valid email address.');
  if (phone && (!/^[+()\d .-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7)) fail('Enter a valid contact number.');
  return { position: payload.position, firstName, lastName, name, email, phone, message, resume: validateResume(payload.resume) };
}

function configuration(env) {
  if (env.RRC_RECRUITMENT_SEND_ENABLED !== 'true') return null;
  const host = env.RRC_SMTP_HOST?.trim();
  const user = env.RRC_SMTP_USER?.trim();
  const pass = env.RRC_SMTP_PASSWORD;
  const from = env.RRC_SMTP_FROM?.trim();
  const port = Number(env.RRC_SMTP_PORT);
  if (!host || !/^[A-Za-z0-9.-]+$/.test(host) || ![465, 587].includes(port) || !isEmail(user) || !pass || !isEmail(from) || !from.toLowerCase().endsWith('@rosefoodrealtycorp.com')) return null;
  return { host, port, user, pass, from, customerConfirmation: env.RRC_CUSTOMER_CONFIRMATION_ENABLED === 'true' };
}

export async function createRecruitmentMailer({ env = process.env, transportFactory } = {}) {
  const config = configuration(env);
  const unavailable = {
    enabled: false,
    async send() { throw new ApplicationError(503, 'Online applications are not connected to HR yet. Your application has not been sent. Please email recruitment@rosefoodrealtycorp.com with your resume.'); },
  };
  if (!config) return unavailable;
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
      const application = validateApplication(payload);
      const mail = {
        from: { name: 'RRC Careers', address: config.from },
        to: RECRUITMENT_RECIPIENT,
        replyTo: { name: application.name, address: application.email },
        subject: `RRC job application: ${application.position} - ${application.name}`,
        text: [
          'New application from the RRC Careers website', '',
          `Position: ${application.position}`, `First name: ${application.firstName}`, `Last name: ${application.lastName}`,
          `Email: ${application.email}`, `Phone: ${application.phone || '(Not supplied)'}`, '',
          'Message:', application.message || '(No message supplied)', '',
          'The applicant confirmed consent to send these details and the attached resume to RRC recruitment for this application.',
        ].join('\n'),
        attachments: [application.resume],
        disableFileAccess: true, disableUrlAccess: true,
      };
      try {
        const result = await transport.sendMail(mail);
        if (!result.accepted?.some(address => String(address).toLowerCase() === RECRUITMENT_RECIPIENT)) throw new Error('Recipient not accepted');
        let customerConfirmationSent = false;
        if (config.customerConfirmation) {
          try {
            const confirmation = await transport.sendMail({
              from: { name: 'RRC Careers', address: config.from },
              to: application.email,
              replyTo: { name: 'RRC Recruitment', address: RECRUITMENT_RECIPIENT },
              subject: `We received your RRC application for ${application.position}`,
              text: [`Hello ${application.firstName},`, '', `Thank you for applying for the ${application.position} position with Rosefood Realty Corporation.`, 'Your application has been received for review by the RRC recruitment team.', '', 'This acknowledgement does not confirm an interview or employment. If your qualifications match the role, the team will contact you using the details you provided.', '', 'Rosefood Realty Corporation'].join('\n'),
              disableFileAccess: true, disableUrlAccess: true,
            });
            customerConfirmationSent = confirmation.accepted?.some(address => String(address).toLowerCase() === application.email.toLowerCase()) === true;
          } catch { /* Staff delivery already succeeded; do not invite duplicate applications. */ }
        }
        return { sent: true, customerConfirmationSent, message: 'Your application has been accepted by the mail service for delivery to HR.' };
      } catch {
        // SMTP may accept a message before a connection drops: do not promise it was not sent.
        throw new ApplicationError(502, 'We could not confirm email delivery. Please contact recruitment@rosefoodrealtycorp.com before retrying to avoid a duplicate application.');
      }
    },
  };
}
