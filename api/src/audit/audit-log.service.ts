import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '../common/context/request-context';

const SENSITIVE_KEYS = new Set([
  'passwordHash',
  'password_hash',
  'jwtPrivateKey',
  'refreshTokenHash',
  'refresh_token_hash',
]);

export function sanitiseSnapshot(obj: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...obj };
  for (const key of SENSITIVE_KEYS) delete copy[key];
  return copy;
}

export interface AuditEntry {
  actorUserId?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  async insert(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    const ctx = getRequestContext();
    await tx.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        actorRole: entry.actorRole ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before
          ? (sanitiseSnapshot(entry.before) as Prisma.InputJsonValue)
          : undefined,
        after: entry.after ? (sanitiseSnapshot(entry.after) as Prisma.InputJsonValue) : undefined,
        requestId: ctx?.requestId ?? null,
        traceId: ctx?.traceId ?? null,
        spanId: ctx?.spanId ?? null,
      },
    });
  }
}
