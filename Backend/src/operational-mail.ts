import nodemailer from 'nodemailer';
import type { PrismaClient } from '@prisma/client';

type DeliveryInput = {
  entityType: string;
  entityId: string;
  templateKey: string;
  recipient: string;
  subject: string;
  text: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let cachedTransport: ReturnType<typeof nodemailer.createTransport> | undefined;

function cleanHeader(value: string) {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180);
}

function getTransport() {
  if (cachedTransport) return cachedTransport;
  if (process.env.RRC_OPERATIONAL_EMAIL_ENABLED !== 'true') return null;
  const host = process.env.RRC_SMTP_HOST?.trim();
  const port = Number(process.env.RRC_SMTP_PORT);
  const user = process.env.RRC_SMTP_USER?.trim();
  const pass = process.env.RRC_SMTP_PASSWORD;
  if (!host || !/^[A-Za-z0-9.-]+$/.test(host) || ![465, 587].includes(port) || !user || !emailPattern.test(user) || !pass) return null;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  return cachedTransport;
}

export async function sendTrackedMail(database: PrismaClient, input: DeliveryInput) {
  const recipient = input.recipient.trim().toLowerCase();
  const delivery = await database.emailDelivery.create({ data: {
    relatedEntityType: input.entityType,
    relatedEntityId: input.entityId,
    templateKey: input.templateKey,
    recipientEmail: recipient,
    status: 'QUEUED',
  } });
  const transport = getTransport();
  const from = process.env.RRC_SMTP_FROM?.trim() || process.env.RRC_SMTP_USER?.trim();
  if (!transport || !from || !emailPattern.test(from) || !emailPattern.test(recipient)) {
    await database.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', failedAt: new Date(), errorCode: 'EMAIL_NOT_CONFIGURED' } });
    return { sent: false, deliveryId: delivery.id };
  }
  try {
    const result = await transport.sendMail({
      from: { name: 'Rosefood Realty Corporation', address: from },
      to: recipient,
      subject: cleanHeader(input.subject),
      text: input.text.replace(/\u0000/g, '').slice(0, 12000),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const accepted = result.accepted?.some((value: unknown) => String(value).toLowerCase() === recipient);
    if (!accepted) throw Object.assign(new Error('Recipient was not accepted'), { code: 'RECIPIENT_REJECTED' });
    await database.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.messageId?.slice(0, 250) } });
    return { sent: true, deliveryId: delivery.id };
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code.slice(0, 80) : 'SMTP_DELIVERY_FAILED';
    await database.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', failedAt: new Date(), errorCode } });
    return { sent: false, deliveryId: delivery.id };
  }
}

export function operationalMailEnabled() {
  return process.env.RRC_OPERATIONAL_EMAIL_ENABLED === 'true';
}
