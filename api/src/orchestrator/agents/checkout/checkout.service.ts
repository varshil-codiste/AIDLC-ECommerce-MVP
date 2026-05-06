import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';
import { CartService, type EnrichedCart } from '../cart/cart.service';

export interface AddressDto {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

export interface CheckoutStartResult {
  cart: EnrichedCart;
  address: AddressDto | null;
  totalCents: number;
  currency: string;
}

type VariantWithProduct = {
  id: string;
  stock: number;
  product: { title: string; priceCents: number; currency: string };
};

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly cartService: CartService,
  ) {}

  async checkoutStart(userId: string): Promise<CheckoutStartResult> {
    const cart = await this.cartService.getEnrichedCart(userId);
    if (cart.items.length === 0) throw new Error('checkout.empty_cart');

    const address = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const addressDto: AddressDto | null = address
      ? {
          id: address.id,
          line1: address.line1,
          line2: address.line2 ?? undefined,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
        }
      : null;

    this.logger.log({ event: 'tool.call', tool: 'checkout_start', userId, itemCount: cart.itemCount });
    return { cart, address: addressDto, totalCents: cart.totalCents, currency: cart.currency };
  }

  simulatePayment(): { success: true } {
    return { success: true };
  }

  async createOrder(userId: string, cartId: string) {
    const address = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { id: cartId, userId, status: 'open' },
        include: {
          items: { include: { variant: { include: { product: true } } } },
        },
      });
      if (!cart) throw new Error('checkout.cart_not_found');
      if (cart.items.length === 0) throw new Error('checkout.empty_cart');

      // Re-validate stock inside the transaction
      const stockConflicts: string[] = [];
      for (const item of cart.items) {
        const variant = item.variant as VariantWithProduct;
        if (item.quantity > variant.stock) {
          stockConflicts.push(variant.product.title);
        }
      }
      if (stockConflicts.length > 0) {
        throw new Error(`checkout.stock_conflict:${stockConflicts.join(',')}`);
      }

      const firstItem = cart.items[0];
      const currency = (firstItem.variant as VariantWithProduct).product.currency;
      const totalCents = cart.items.reduce(
        (sum, item) => sum + (item.variant as VariantWithProduct).product.priceCents * item.quantity,
        0,
      );

      const order = await tx.order.create({
        data: {
          userId,
          status: 'confirmed',
          totalCents,
          currency,
          shippingAddressId: address?.id ?? null,
          paymentRef: `sim_${Date.now()}`,
          lastStatusChangeAt: new Date(),
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchaseCents: (item.variant as VariantWithProduct).product.priceCents,
        })),
      });

      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cart.update({ where: { id: cartId }, data: { status: 'checked_out' } });

      await this.auditLog.insert(tx, {
        actorUserId: userId,
        actorRole: 'shopper',
        action: 'checkout',
        entity: 'order',
        entityId: order.id,
        before: { cartId },
        after: { status: 'confirmed', totalCents, currency },
      });

      this.logger.log({ event: 'tool.call', tool: 'checkout_pay', userId, orderId: order.id, totalCents });
      return order;
    });
  }
}
