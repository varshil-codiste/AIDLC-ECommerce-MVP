import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from '../checkout.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';
import type { CartService, EnrichedCart } from '../../cart/cart.service';

const CART_ID = 'cart-1';
const USER_ID = 'user-1';
const ORDER_ID = 'order-1';

const makeAddress = () => ({
  id: 'addr-1',
  userId: USER_ID,
  type: 'shipping',
  line1: '123 Main St',
  line2: null,
  city: 'Mumbai',
  state: 'MH',
  postalCode: '400001',
  countryCode: 'IN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeEnrichedCart = (itemCount = 2): EnrichedCart => ({
  cartId: CART_ID,
  items: Array.from({ length: itemCount }, (_, i) => ({
    itemId: `item-${i}`,
    variantId: `var-${i}`,
    title: `Product ${i}`,
    variantLabel: `SKU-00${i}`,
    priceCents: 5000,
    currency: 'INR',
    quantity: 1,
    lineTotalCents: 5000,
  })),
  totalCents: itemCount * 5000,
  currency: 'INR',
  itemCount,
});

const makeCartWithItems = (quantity = 1) => ({
  id: CART_ID,
  userId: USER_ID,
  status: 'open',
  items: [
    {
      id: 'item-1',
      variantId: 'var-1',
      quantity,
      variant: {
        id: 'var-1',
        stock: 10,
        product: { title: 'Nike Air Max', priceCents: 5000, currency: 'INR' },
      },
    },
  ],
});

const makeOrder = () => ({
  id: ORDER_ID,
  userId: USER_ID,
  status: 'confirmed',
  totalCents: 5000,
  currency: 'INR',
  shippingAddressId: 'addr-1',
  paymentRef: 'sim_12345',
  placedAt: new Date(),
  lastStatusChangeAt: new Date(),
  trackingNumber: null,
  trackingCarrier: null,
  returnReason: null,
  returnRequestedAt: null,
});

const makePrisma = () => ({
  address: {
    findFirst: vi.fn().mockResolvedValue(makeAddress()),
  },
  cart: {
    findFirst: vi.fn().mockResolvedValue(makeCartWithItems()),
    update: vi.fn().mockResolvedValue({}),
  },
  cartItem: {
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  order: {
    create: vi.fn().mockResolvedValue(makeOrder()),
  },
  orderItem: {
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  productVariant: {
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      cart: { findFirst: vi.fn().mockResolvedValue(makeCartWithItems()), update: vi.fn() },
      order: { create: vi.fn().mockResolvedValue(makeOrder()) },
      orderItem: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      productVariant: { update: vi.fn().mockResolvedValue({}) },
    }),
  ),
});

const makeCartService = (itemCount = 2) => ({
  getEnrichedCart: vi.fn().mockResolvedValue(makeEnrichedCart(itemCount)),
  getOrCreateCart: vi.fn(),
  addItem: vi.fn(),
  updateQty: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: ReturnType<typeof makePrisma>;
  let cartService: ReturnType<typeof makeCartService>;

  beforeEach(() => {
    prisma = makePrisma();
    cartService = makeCartService();
    service = new CheckoutService(
      prisma as unknown as PrismaService,
      makeAudit() as unknown as AuditLogService,
      cartService as unknown as CartService,
    );
  });

  it('checkoutStart throws checkout.empty_cart when cart is empty', async () => {
    cartService.getEnrichedCart.mockResolvedValue(makeEnrichedCart(0));
    await expect(service.checkoutStart(USER_ID)).rejects.toThrow('checkout.empty_cart');
  });

  it('checkoutStart returns address null when no address saved', async () => {
    prisma.address.findFirst.mockResolvedValue(null);
    const result = await service.checkoutStart(USER_ID);
    expect(result.address).toBeNull();
  });

  it('createOrder succeeds and returns confirmed order', async () => {
    const order = await service.createOrder(USER_ID, CART_ID);
    expect(order.id).toBe(ORDER_ID);
    expect(order.status).toBe('confirmed');
  });

  it('createOrder throws checkout.stock_conflict when stock is insufficient', async () => {
    prisma.$transaction.mockImplementationOnce((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        cart: {
          findFirst: vi.fn().mockResolvedValue({
            ...makeCartWithItems(20),
            items: [{
              id: 'item-1',
              variantId: 'var-1',
              quantity: 20,
              variant: { id: 'var-1', stock: 3, product: { title: 'Nike Air Max', priceCents: 5000, currency: 'INR' } },
            }],
          }),
          update: vi.fn(),
        },
        order: { create: vi.fn() },
        orderItem: { createMany: vi.fn() },
        productVariant: { update: vi.fn() },
      }),
    );
    await expect(service.createOrder(USER_ID, CART_ID)).rejects.toThrow('checkout.stock_conflict');
  });
});
