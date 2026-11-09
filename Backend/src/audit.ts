import type { Prisma, PrismaClient } from '@prisma/client';

export type AuditInput = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Prisma.InputJsonObject;
};

export async function recordAuditEvent(database: Pick<PrismaClient, 'auditEvent'>, input: AuditInput) {
  const { actorId, metadata, ...event } = input;
  return database.auditEvent.create({
    data: {
      ...event,
      ...(actorId ? { actor: { connect: { id: actorId } } } : {}),
      ...(metadata ? { metadata } : {}),
    },
  });
}
