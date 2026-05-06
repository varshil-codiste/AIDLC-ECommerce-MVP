import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyGuard } from './idempotency.guard';

@Module({
  imports: [ScheduleModule],
  providers: [IdempotencyService, IdempotencyGuard],
  exports: [IdempotencyService, IdempotencyGuard],
})
export class IdempotencyModule {}
