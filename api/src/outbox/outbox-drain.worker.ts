import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { topicFromEventType } from './types/agent-event-payload.types';

interface PendingEvent {
  id: string;
  event_type: string;
  payload: unknown;
}

const BATCH_SIZE = 100;
const STREAM_MAX_LEN = 100_000;

@Injectable()
export class OutboxDrainWorker {
  private readonly logger = new Logger(OutboxDrainWorker.name);
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Interval(1000)
  async drainCycle(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    const start = Date.now();

    try {
      const rows = await this.fetchPendingBatch();
      if (rows.length === 0) return;

      const committed = await this.pipelineXADD(rows);
      if (committed.length > 0) {
        await this.commitDrained(committed);
      }

      const elapsed = Date.now() - start;
      this.logger.log({
        event: 'outbox.drain_cycle',
        fetched: rows.length,
        committed: committed.length,
        elapsedMs: elapsed,
        outbox_drain_cycle_ms: elapsed,
        outbox_pending_rows: rows.length - committed.length,
      });
    } catch (err) {
      this.logger.warn({ event: 'outbox.drain.error', err });
    } finally {
      this.draining = false;
    }
  }

  private async fetchPendingBatch(): Promise<PendingEvent[]> {
    return this.prisma.$queryRaw<PendingEvent[]>`
      SELECT id, event_type, payload
      FROM app.agent_events
      WHERE committed_to_stream_at IS NULL
      ORDER BY created_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `;
  }

  private async pipelineXADD(rows: PendingEvent[]): Promise<string[]> {
    const pipeline = this.redis.pipeline();

    for (const row of rows) {
      const stream = `events:${topicFromEventType(row.event_type)}`;
      pipeline.xadd(
        stream,
        'MAXLEN',
        '~',
        String(STREAM_MAX_LEN),
        '*',
        'eventId',
        row.id,
        'eventType',
        row.event_type,
        'payload',
        JSON.stringify(row.payload),
      );
    }

    const results = await pipeline.exec();
    const committed: string[] = [];

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err] = results[i] as [Error | null, unknown];
        if (!err) {
          committed.push(rows[i].id);
        } else {
          this.logger.warn({
            event: 'outbox.drain.xadd_failed',
            eventId: rows[i].id,
            err,
          });
        }
      }
    }

    return committed;
  }

  private async commitDrained(ids: string[]): Promise<void> {
    await this.prisma.agentEvent.updateMany({
      where: { id: { in: ids } },
      data: { committedToStreamAt: new Date() },
    });
  }
}
