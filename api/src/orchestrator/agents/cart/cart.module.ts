import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LlmModule } from '../../llm/llm.module';
import { CartService } from './cart.service';
import { CartAgent } from './cart.agent';
import { CheckoutService } from '../checkout/checkout.service';
import { CheckoutAgent } from '../checkout/checkout.agent';

@Module({
  imports: [PrismaModule, LlmModule],
  providers: [CartService, CheckoutService, CartAgent, CheckoutAgent],
  exports: [CartService, CheckoutService],
})
export class CartModule {}
