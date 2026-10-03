import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { PlatformConfig } from './config.js';

type RequestEmailContext = {
  type: 'VIEWING' | 'APPLICATION';
  reference: string;
  propertyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
};

type SendResult = { enabled: boolean; accepted: boolean };

function text(value: string | null | undefined) { return value?.trim() || 'Not provided'; }

function buildTransport(config: PlatformConfig): Transporter | undefined {
  if (config.RRC_OPERATIONAL_EMAIL_ENABLED !== 'true') return undefined;
  if (!config.RRC_SMTP_HOST || !config.RRC_SMTP_PORT || !config.RRC_SMTP_USERNAME || !config.RRC_SMTP_PASSWORD || !config.RRC_SMTP_FROM_ADDRESS) return undefined;
  return nodemailer.createTransport({
    host: config.RRC_SMTP_HOST,
    port: config.RRC_SMTP_PORT,
    secure: config.RRC_SMTP_PORT === 465,
    auth: { user: config.RRC_SMTP_USERNAME, pass: config.RRC_SMTP_PASSWORD },
    tls: { minVersion: 'TLSv1.2' },
  });
}

export function createOperationalMailer(config: PlatformConfig, transport = buildTransport(config)) {
  const from = `${config.RRC_SMTP_FROM_NAME} <${config.RRC_SMTP_FROM_ADDRESS ?? config.RRC_LEASING_RECIPIENT}>`;
  const disabled = !transport;
  const send = async (message: Parameters<Transporter['sendMail']>[0]): Promise<SendResult> => {
    if (!transport) return { enabled: false, accepted: false };
    try {
      const result = await transport.sendMail(message);
      return { enabled: true, accepted: (result.accepted?.length ?? 0) > 0 };
    } catch {
      // Database work and staff workflow must remain available if SMTP is down.
      return { enabled: true, accepted: false };
    }
  };
  const requestLabel = (item: RequestEmailContext) => item.type === 'VIEWING' ? 'viewing request' : 'lease application';
  const summary = (item: RequestEmailContext) => `Property: ${item.reference} — ${item.propertyName}\nApplicant: ${item.contactName}\nEmail: ${item.email}\nPhone: ${text(item.phone)}\nNotes: ${text(item.notes)}`;

  return {
    enabled: !disabled,
    initial: async (item: RequestEmailContext) => {
      const label = requestLabel(item);
      const staff = await send({ from, to: config.RRC_LEASING_RECIPIENT, replyTo: item.email, subject: `New ${label}: ${item.reference}`, text: `A new ${label} needs review.\n\n${summary(item)}\n\nOpen the RRC Operations dashboard to review it.` });
      const customer = await send({ from, to: item.email, replyTo: config.RRC_LEASING_RECIPIENT, subject: 'We received your RRC leasing request', text: `Hello ${item.contactName},\n\nThank you for your ${label} for ${item.reference} — ${item.propertyName}. We have received your details and the RRC Leasing team will review them.\n\nRegards,\nRosefood Realty Corporation` });
      return { enabled: !disabled, staffAccepted: staff.accepted, customerAccepted: customer.accepted };
    },
    reviewing: async (item: RequestEmailContext) => send({ from, to: item.email, replyTo: config.RRC_LEASING_RECIPIENT, subject: `RRC is reviewing your request for ${item.reference}`, text: `Hello ${item.contactName},\n\nThe RRC Leasing team is now reviewing your ${requestLabel(item)} for ${item.reference} — ${item.propertyName}. We will contact you if we need anything else.\n\nRegards,\nRosefood Realty Corporation` }),
    resubmission: async (item: RequestEmailContext, url: string, requiredDocuments: string[], expiresAt: Date) => send({ from, to: item.email, replyTo: config.RRC_LEASING_RECIPIENT, subject: `Action needed: documents for your RRC application`, text: `Hello ${item.contactName},\n\nTo continue reviewing your application for ${item.reference} — ${item.propertyName}, please submit:\n${requiredDocuments.map(value => `- ${value}`).join('\n')}\n\nUse this private upload link: ${url}\n\nThis link expires ${expiresAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}. Do not share it with anyone.\n\nRegards,\nRosefood Realty Corporation` }),
  };
}
