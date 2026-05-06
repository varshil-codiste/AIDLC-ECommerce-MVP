import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LlmCostMeterService } from './llm-cost-meter.service';
import { BudgetAlarmWorker } from './budget-alarm.worker';

@Global()
@Module({
  imports: [ScheduleModule],
  providers: [LlmCostMeterService, BudgetAlarmWorker],
  exports: [LlmCostMeterService],
})
export class TelemetryModule {}
