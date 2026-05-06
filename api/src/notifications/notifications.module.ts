import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationService } from './notification.service';
import { OrderEventListener } from './listeners/order-event.listener';
import { LowStockWatcher } from './watchers/low-stock.watcher';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [NotificationService, OrderEventListener, LowStockWatcher],
  exports: [NotificationService],
})
export class NotificationsModule {}
