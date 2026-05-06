import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationService } from '../notification.service';
import { RedisService } from '../../redis/redis.service';

const STREAM = 'events:order';
const CURSOR_KEY = 'notifications:stream_cursor';
const BATCH_SIZE = 50;

@Injectable()
export class OrderEventListener {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly redis: RedisService,
  ) {}

  @Interval(2000)
  async pollOrderStream(): Promise<void> {
    const cursor = (await this.redis.hget(CURSOR_KEY, STREAM)) ?? '0';
    const messages = await this.redis.xreadMessages(STREAM, cursor, BATCH_SIZE);
    if (messages.length === 0) return;

    let lastId = cursor;
    for (const msg of messages) {
      try {
        const { eventType, payload } = this.parseMessage(msg.data);
        if (eventType === 'order.created') {
          const parsed = JSON.parse(payload) as { orderId: string; totalCents: number; currency: string };
          await this.notificationService.createForMerchants('order.created', {
            orderId: parsed.orderId,
            totalCents: parsed.totalCents,
            currency: parsed.currency,
          });
          this.logger.log({ event: 'notification.order_created', orderId: parsed.orderId });
        }
      } catch (err) {
        this.logger.warn({ event: 'notification.listener.parse_error', msgId: msg.id, err });
      }
      lastId = msg.id;
    }

    await this.redis.hset(CURSOR_KEY, STREAM, lastId);
  }

  private parseMessage(data: Record<string, string>): { eventType: string; payload: string } {
    return {
      eventType: data['eventType'] ?? '',
      payload: data['payload'] ?? '{}',
    };
  }
}
