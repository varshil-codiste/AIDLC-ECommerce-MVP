import { Global, Module } from '@nestjs/common';
import { AuditPrismaService } from './audit-prisma.service';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [AuditPrismaService, AuditLogService],
  exports: [AuditPrismaService, AuditLogService],
})
export class AuditModule {}
