import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async search(query: string, limit = 10) {
    return this.prisma.customer.findMany({
      where: {
        OR: [
          { user: { email: { contains: query, mode: 'insensitive' } } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { tags: { has: query } },
        ],
      },
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
      take: limit,
      orderBy: { ltvCents: 'desc' },
    });
  }

  async getById(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true, status: true } },
      },
    });
  }

  async getTopByLTV(limit = 10, dateFrom?: string, dateTo?: string) {
    if (dateFrom || dateTo) {
      // When date filter is present, recalculate from orders in that range
      const customers = await this.prisma.customer.findMany({
        include: {
          user: {
            select: { id: true, email: true, name: true, status: true },
            include: {
              orders: {
                where: {
                  status: { in: ['confirmed', 'shipped', 'delivered'] },
                  ...(dateFrom || dateTo ? {
                    placedAt: {
                      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                      ...(dateTo ? { lte: new Date(dateTo) } : {}),
                    },
                  } : {}),
                },
                select: { totalCents: true },
              },
            },
          },
        },
      });
      return customers
        .map((c) => ({
          ...c,
          periodLtvCents: (c.user as unknown as { orders: Array<{ totalCents: number }> }).orders.reduce(
            (sum, o) => sum + o.totalCents, 0,
          ),
        }))
        .sort((a, b) => b.periodLtvCents - a.periodLtvCents)
        .slice(0, limit);
    }

    return this.prisma.customer.findMany({
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
      orderBy: { ltvCents: 'desc' },
      take: limit,
    });
  }

  async addTag(customerId: string, newTags: string[], actorId: string, actorRole: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, include: { user: true } });
    if (!customer) throw new Error('customer.not_found');
    if ((customer.user as { status: string }).status === 'anonymized') throw new Error('customer.anonymized');

    // Deduplicate case-insensitively (BR-CUST-01)
    const existing = new Set(customer.tags.map((t) => t.toLowerCase()));
    const toAdd = newTags.filter((t) => !existing.has(t.toLowerCase())).slice(0, 50);
    const merged = [...customer.tags, ...toAdd].slice(0, 20);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { tags: merged },
      });
      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'add_tag',
        entity: 'customer',
        entityId: customerId,
        before: { tags: customer.tags },
        after: { tags: merged },
      });
      this.logger.log({ event: 'tool.call', tool: 'customer_add_tag', customerId, added: toAdd.length, actorId });
      return updated;
    });
  }

  async anonymize(customerId: string, actorId: string, actorRole: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, include: { user: true } });
    if (!customer) throw new Error('customer.not_found');
    if ((customer.user as { status: string }).status === 'anonymized') throw new Error('customer.already_anonymized');

    const anonymizedEmail = `anon-${customer.userId}@deleted.local`;

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customer.userId },
        data: { email: anonymizedEmail, name: null, phone: null, status: 'anonymized' },
      });
      // PII-safe audit log — never log the real values (BR-CUST-04, NFR-08-SEC-03)
      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'anonymize',
        entity: 'user',
        entityId: customer.userId,
        after: { email: anonymizedEmail, name: null, phone: null, status: 'anonymized' },
      });
      this.logger.log({ event: 'tool.call', tool: 'customer_anonymize', customerId, actorId, success: true });
      return { customerId, anonymized: true };
    });
  }
}
