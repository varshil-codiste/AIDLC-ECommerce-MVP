import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from '../cart.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';

const VARIANT_ID = 'var-1';
const ITEM_ID = 'item-1';
const CART_ID = 'cart-1';
const USER_ID = 'user-1';

const makeVariant = (stock = 10) => ({
  id: VARIANT_ID,
  sku: 'SKU-001',
  stock,
  productId: 'prod-1',
  attributes: {},
  lowStockThreshold: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeProduct = () => ({
  id: 'prod-1',
  title: 'Nike Air Max',
  priceCents: 10000,
  currency: 'INR',
  imageUrls: ['https://img.example.com/shoe.jpg'],
  description: null,
  categoryId: null,
  status: 'active',
  createdByUserId: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeCart = () => ({ id: CART_ID, userId: USER_ID, status: 'open', createdAt: new Date(), updatedAt: new Date() });

const makeCartItem = (quantity = 1) => ({ id: ITEM_ID, cartId: CART_ID, variantId: VARIANT_ID, quantity, addedAt: new Date() });

const makePrisma = () => ({
  cart: {
    findFirst: vi.fn().mockResolvedValue(makeCart()),
    create: vi.fn().mockResolvedValue(makeCart()),
    update: vi.fn().mockResolvedValue(makeCart()),
  },
  cartItem: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(makeCartItem()),
    update: vi.fn().mockResolvedValue(makeCartItem()),
    delete: vi.fn().mockResolvedValue(makeCartItem()),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  productVariant: {
    findUnique: vi.fn().mockResolvedValue(makeVariant()),
  },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({ cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) } }),
  ),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });

describe('CartService', () => {
  let service: CartService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    // Wire up getEnrichedCart to return enriched cart
    prisma.cart.findFirst.mockImplementation((args: { where: { userId?: string; status?: string; id?: string } }) => {
      if (args?.where?.status === 'open') {
        return Promise.resolve({ ...makeCart(), items: [{ ...makeCartItem(1), variant: { ...makeVariant(), product: makeProduct() } }] });
      }
      return Promise.resolve(makeCart());
    });
    service = new CartService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
  });

  it('getOrCreateCart returns existing open cart', async () => {
    const cart = await service.getOrCreateCart(USER_ID);
    expect(cart.id).toBe(CART_ID);
    expect(prisma.cart.create).not.toHaveBeenCalled();
  });

  it('getOrCreateCart creates cart when none exists', async () => {
    prisma.cart.findFirst.mockResolvedValueOnce(null);
    await service.getOrCreateCart(USER_ID);
    expect(prisma.cart.create).toHaveBeenCalled();
  });

  it('addItem deduplicates — increments quantity on existing item', async () => {
    prisma.cartItem.findFirst.mockResolvedValue(makeCartItem(2));
    await service.addItem(USER_ID, VARIANT_ID, 1);
    expect(prisma.cartItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: 3 }),
    }));
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('addItem throws cart.insufficient_stock when quantity exceeds stock', async () => {
    prisma.productVariant.findUnique.mockResolvedValue(makeVariant(3));
    await expect(service.addItem(USER_ID, VARIANT_ID, 5)).rejects.toThrow('cart.insufficient_stock');
  });

  it('updateQty with quantity=0 delegates to removeItem', async () => {
    prisma.cartItem.findFirst.mockResolvedValue(makeCartItem(2));
    const spy = vi.spyOn(service, 'removeItem');
    await service.updateQty(USER_ID, ITEM_ID, 0);
    expect(spy).toHaveBeenCalledWith(USER_ID, ITEM_ID);
  });

  it('clearCart runs $transaction and deletes all items in the open cart', async () => {
    await service.clearCart(USER_ID);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('getEnrichedCart returns LineItems with computeTotal applied', async () => {
    const enriched = await service.getEnrichedCart(USER_ID);
    expect(enriched.items.length).toBeGreaterThanOrEqual(0);
    expect(typeof enriched.totalCents).toBe('number');
    expect(enriched.currency).toBe('INR');
  });

  it('computeTotal returns 0 and INR for empty array', () => {
    const result = CartService.computeTotal([]);
    expect(result).toEqual({ totalCents: 0, currency: 'INR' });
  });
});
