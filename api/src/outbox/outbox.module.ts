import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { OutboxDrainWorker } from './outbox-drain.worker';

@Module({
  imports: [ScheduleModule],
  providers: [OutboxService, OutboxDrainWorker],
  exports: [OutboxService],
})
export class OutboxModule {}
