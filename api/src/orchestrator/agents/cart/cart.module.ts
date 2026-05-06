import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LlmModule } from '../../llm/llm.module';
import { CartService } from './cart.service';
import { CheckoutService } from '../checkout/checkout.service';

@Module({
  imports: [PrismaModule, LlmModule],
  providers: [CartService, CheckoutService],
  exports: [CartService, CheckoutService],
})
export class CartModule {}
