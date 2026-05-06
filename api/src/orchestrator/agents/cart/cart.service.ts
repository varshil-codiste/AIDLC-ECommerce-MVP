import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';

export interface LineItem {
  itemId: string;
  variantId: string;
  title: string;
  variantLabel: string;
  priceCents: number;
  currency: string;
  quantity: number;
  lineTotalCents: number;
  imageUrl?: string;
}

export interface EnrichedCart {
  cartId: string;
  items: LineItem[];
  totalCents: number;
  currency: string;
  itemCount: number;
}

type VariantWithProduct = {
  id: string;
  sku: string;
  stock: number;
  product: { title: string; priceCents: number; currency: string; imageUrls: string[] };
};

type CartItemWithVariant = {
  id: string;
  variantId: string;
  quantity: number;
  variant: VariantWithProduct;
};

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findFirst({ where: { userId, status: 'open' } });
    if (existing) return existing;
    try {
      return await this.prisma.cart.create({ data: { userId, status: 'open' } });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        const cart = await this.prisma.cart.findFirst({ where: { userId, status: 'open' } });
        if (cart) return cart;
      }
      throw err;
    }
  }

  async addItem(userId: string, variantOrProductId: string, quantity: number): Promise<EnrichedCart> {
    const cart = await this.getOrCreateCart(userId);

    // Try as variantId first; if not found, treat as productId and pick first in-stock variant
    let variant = await this.prisma.productVariant.findUnique({ where: { id: variantOrProductId } });
    if (!variant) {
      const product = await this.prisma.product.findUnique({
        where: { id: variantOrProductId },
        include: { variants: { orderBy: { stock: 'desc' } } },
      });
      if (product?.variants?.length) variant = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    }
    if (!variant) throw new Error('cart.variant_not_found');
    const variantId = variant.id;

    const existing = await this.prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId } });
    const newQty = (existing?.quantity ?? 0) + quantity;
    if (newQty > variant.stock) {
      throw new Error(`cart.insufficient_stock:${variant.stock}`);
    }

    if (existing) {
      await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await this.prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
    }

    this.logger.log({ event: 'tool.call', tool: 'cart_add', userId, variantId, quantity });
    return this.getEnrichedCart(userId);
  }

  async updateQty(userId: string, itemId: string, quantity: number): Promise<EnrichedCart> {
    if (quantity === 0) return this.removeItem(userId, itemId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId, status: 'open' } },
    });
    if (!item) throw new Error('cart.item_not_found');

    const variant = await this.prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant) throw new Error('cart.variant_not_found');
    if (quantity > variant.stock) throw new Error(`cart.insufficient_stock:${variant.stock}`);

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    this.logger.log({ event: 'tool.call', tool: 'cart_update_qty', userId, itemId, quantity });
    return this.getEnrichedCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<EnrichedCart> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId, status: 'open' } },
    });
    if (!item) throw new Error('cart.item_not_found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    this.logger.log({ event: 'tool.call', tool: 'cart_remove', userId, itemId });
    return this.getEnrichedCart(userId);
  }

  async clearCart(userId: string): Promise<EnrichedCart> {
    const cart = await this.prisma.cart.findFirst({ where: { userId, status: 'open' } });
    if (cart) {
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await this.auditLog.insert(tx, {
          actorUserId: userId,
          actorRole: 'shopper',
          action: 'cart_clear',
          entity: 'cart',
          entityId: cart.id,
          before: {},
          after: { itemCount: 0 },
        });
      });
      this.logger.log({ event: 'tool.call', tool: 'cart_clear', userId, cartId: cart.id });
    }
    return this.getEnrichedCart(userId);
  }

  async getEnrichedCart(userId: string): Promise<EnrichedCart> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'open' },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });

    if (!cart) {
      return { cartId: '', items: [], totalCents: 0, currency: 'INR', itemCount: 0 };
    }

    const items: LineItem[] = (cart.items as CartItemWithVariant[]).map((ci) => ({
      itemId: ci.id,
      variantId: ci.variantId,
      title: ci.variant.product.title,
      variantLabel: ci.variant.sku,
      priceCents: ci.variant.product.priceCents,
      currency: ci.variant.product.currency,
      quantity: ci.quantity,
      lineTotalCents: ci.variant.product.priceCents * ci.quantity,
      imageUrl: ci.variant.product.imageUrls[0] ?? undefined,
    }));

    const { totalCents, currency } = CartService.computeTotal(items);
    return {
      cartId: cart.id,
      items,
      totalCents,
      currency,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  static computeTotal(items: LineItem[]): { totalCents: number; currency: string } {
    if (items.length === 0) return { totalCents: 0, currency: 'INR' };
    const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return { totalCents, currency: items[0].currency };
  }
}
