import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AGENT_REGISTRY } from './agents/agent.interface';
import { LlmModule } from './llm/llm.module';
import { PromptLoaderService } from './prompts/prompt-loader.service';
import { RouterAgent } from './agents/router.agent';
import { NoopAgent } from './agents/noop.agent';
import { ProductAgent } from './agents/product/product.agent';
import { ProductService } from './agents/product/product.service';
import { OrderAgent } from './agents/order/order.agent';
import { OrderService } from './agents/order/order.service';
import { AttentionService } from './agents/order/attention.service';
import { CustomerAgent } from './agents/customer/customer.agent';
import { CustomerService } from './agents/customer/customer.service';
import { NotificationAgent } from './agents/notification/notification.agent';
import { agentRegistryProvider } from './agents/agent-registry';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { CartModule } from './agents/cart/cart.module';
import { CartAgent } from './agents/cart/cart.agent';
import { CheckoutAgent } from './agents/checkout/checkout.agent';
import { ConfirmationService } from './confirmation/confirmation.service';
import { ConfirmationGuard } from './confirmation/confirmation.guard';
import { DashboardDigestService } from './dashboard/dashboard-digest.service';
import { ConversationRepository } from './repositories/conversation.repository';
import { OrchestratorService } from './orchestrator.service';
import { ChatController } from './controllers/chat.controller';
import { IntentController } from './controllers/intent.controller';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [
    LlmModule,
    RedisModule,
    PrismaModule,
    TelemetryModule,
    NotificationsModule,
    EmbeddingModule,
    CartModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [ChatController, IntentController],
  providers: [
    PromptLoaderService,
    RouterAgent,
    NoopAgent,
    ProductAgent,
    ProductService,
    OrderAgent,
    OrderService,
    AttentionService,
    CustomerAgent,
    CustomerService,
    NotificationAgent,
    CartAgent,
    CheckoutAgent,
    agentRegistryProvider,
    ConfirmationService,
    ConfirmationGuard,
    DashboardDigestService,
    ConversationRepository,
    OrchestratorService,
  ],
  exports: [OrchestratorService, AGENT_REGISTRY],
})
export class OrchestratorModule {}
