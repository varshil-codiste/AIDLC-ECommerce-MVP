import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Counter, Gauge, Registry } from 'prom-client';
import { LlmCostMeterService } from './llm-cost-meter.service';

@Injectable()
export class BudgetAlarmWorker {
  private readonly logger = new Logger(BudgetAlarmWorker.name);
  private readonly registry = new Registry();

  private readonly alarm80Counter = new Counter({
    name: 'budget_alarm_80pct_total',
    help: 'Number of times weekly LLM budget crossed 80%',
    registers: [this.registry],
  });

  private readonly alarm100Counter = new Counter({
    name: 'budget_alarm_100pct_total',
    help: 'Number of times weekly LLM budget crossed 100%',
    registers: [this.registry],
  });

  private readonly weeklyGauge = new Gauge({
    name: 'llm_cost_usd_weekly_total',
    help: 'Current 7-day trailing LLM cost in USD',
    registers: [this.registry],
  });

  constructor(
    private readonly costMeter: LlmCostMeterService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkBudget(): Promise<void> {
    try {
      const weeklyBudget = this.config.get<number>('LLM_BUDGET_WEEKLY_USD', 100);
      const sumUsd = await this.costMeter.getLast7DaysCost();

      this.weeklyGauge.set(sumUsd);

      if (sumUsd >= weeklyBudget) {
        this.alarm100Counter.inc();
        this.logger.error({
          event: 'budget.alarm.100pct',
          sumUsd,
          weeklyBudget,
        });
      } else if (sumUsd >= weeklyBudget * 0.8) {
        this.alarm80Counter.inc();
        this.logger.warn({
          event: 'budget.alarm.80pct',
          sumUsd,
          weeklyBudget,
        });
      }
    } catch (err) {
      this.logger.error({ event: 'budget.alarm.error', err });
    }
  }
}
