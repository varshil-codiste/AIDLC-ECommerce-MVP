import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

if (process.env.NODE_ENV === 'production') {
  console.error('seed.ts must not run in production');
  process.exit(1);
}

const prisma = new PrismaClient();

const SEED_USERS = [
  { email: 'shopper@dev.local', role: 'shopper', password: 'shopper-dev-passw0rd!', name: 'Dev Shopper' },
  { email: 'merchant@dev.local', role: 'merchant', password: 'merchant-dev-passw0rd!', name: 'Dev Merchant' },
  { email: 'admin@dev.local', role: 'admin', password: 'admin-dev-passw0rd!', name: 'Dev Admin' },
] as const;

const SEED_CATEGORIES = [
  { name: 'Smartphones', slug: 'smartphones' },
  { name: 'Laptops', slug: 'laptops' },
  { name: 'Audio', slug: 'audio' },
  { name: 'Accessories', slug: 'accessories' },
] as const;

const SEED_PRODUCTS = [
  {
    title: 'Samsung Galaxy S24',
    description: 'Latest Samsung flagship with AI features, 6.2" FHD+ display, 50MP camera, Snapdragon 8 Gen 3',
    priceCents: 7999900,
    category: 'smartphones',
    imageUrls: ['https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/1.webp'],
    variants: [
      { sku: 'SGS24-BLK-128', attributes: { color: 'Black', storage: '128GB' }, stock: 25 },
      { sku: 'SGS24-WHT-256', attributes: { color: 'White', storage: '256GB' }, stock: 12 },
    ],
  },
  {
    title: 'iPhone 15 Pro',
    description: "Apple's latest Pro model with titanium design, A17 Pro chip, 48MP main camera",
    priceCents: 13490000,
    category: 'smartphones',
    imageUrls: ['https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/1.webp'],
    variants: [
      { sku: 'IP15P-BLK-128', attributes: { color: 'Black Titanium', storage: '128GB' }, stock: 10 },
      { sku: 'IP15P-WHT-256', attributes: { color: 'White Titanium', storage: '256GB' }, stock: 8 },
    ],
  },
  {
    title: 'iPhone 14',
    description: '6.1" Super Retina XDR, A15 Bionic chip, 12MP camera, excellent value flagship',
    priceCents: 7990000,
    category: 'smartphones',
    imageUrls: ['https://cdn.dummyjson.com/product-images/smartphones/iphone-x/1.webp'],
    variants: [
      { sku: 'IP14-BLK-128', attributes: { color: 'Black', storage: '128GB' }, stock: 40 },
      { sku: 'IP14-BLU-256', attributes: { color: 'Blue', storage: '256GB' }, stock: 20 },
    ],
  },
  {
    title: 'OnePlus 12',
    description: 'Flagship killer with Snapdragon 8 Gen 3, 6.82" LTPO AMOLED, 50MP Hasselblad camera',
    priceCents: 6499900,
    category: 'smartphones',
    imageUrls: ['https://cdn.dummyjson.com/product-images/smartphones/oppo-k1/1.webp'],
    variants: [
      { sku: 'OP12-BLK-256', attributes: { color: 'Silky Black', storage: '256GB' }, stock: 30 },
      { sku: 'OP12-GRN-256', attributes: { color: 'Flowy Emerald', storage: '256GB' }, stock: 15 },
    ],
  },
  {
    title: 'Sony WH-1000XM5',
    description: 'Industry-leading noise cancelling headphones, 30-hour battery, multipoint connection',
    priceCents: 2990000,
    category: 'audio',
    imageUrls: ['https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp'],
    variants: [
      { sku: 'SNYWH5-BLK', attributes: { color: 'Black' }, stock: 50 },
      { sku: 'SNYWH5-SLV', attributes: { color: 'Silver' }, stock: 30 },
    ],
  },
  {
    title: 'MacBook Air M3',
    description: '13.6" Liquid Retina display, Apple M3 chip, 18-hour battery, fanless design',
    priceCents: 11490000,
    category: 'laptops',
    imageUrls: ['https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/1.webp'],
    variants: [
      { sku: 'MBA-M3-8-256', attributes: { ram: '8GB', storage: '256GB', color: 'Midnight' }, stock: 20 },
      { sku: 'MBA-M3-16-512', attributes: { ram: '16GB', storage: '512GB', color: 'Silver' }, stock: 15 },
    ],
  },
  {
    title: 'USB-C Charging Cable (1m)',
    description: 'Premium braided USB-C to USB-C cable, supports 100W fast charging and data transfer',
    priceCents: 149900,
    category: 'accessories',
    imageUrls: ['https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/1.webp'],
    variants: [
      { sku: 'USBC-1M-BLK', attributes: { color: 'Black', length: '1m' }, stock: 200 },
      { sku: 'USBC-2M-BLK', attributes: { color: 'Black', length: '2m' }, stock: 150 },
    ],
  },
  {
    title: 'Google Pixel 8',
    description: 'Pure Android experience, Google Tensor G3, best-in-class camera with AI features',
    priceCents: 7599900,
    category: 'smartphones',
    imageUrls: ['https://cdn.dummyjson.com/product-images/smartphones/vivo-s1/1.webp'],
    variants: [
      { sku: 'GP8-HAZ-128', attributes: { color: 'Hazel', storage: '128GB' }, stock: 15 },
      { sku: 'GP8-OBS-256', attributes: { color: 'Obsidian', storage: '256GB' }, stock: 10 },
    ],
  },
] as const;

async function main() {
  // Users
  for (const u of SEED_USERS) {
    const passwordHash = await argon2.hash(u.password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, role: u.role, passwordHash, name: u.name, status: 'active' },
    });
    console.log(`seeded: ${u.email} (${u.role})`);
  }

  const merchant = await prisma.user.findUniqueOrThrow({ where: { email: 'merchant@dev.local' } });
  const shopper = await prisma.user.findUniqueOrThrow({ where: { email: 'shopper@dev.local' } });

  // Default shipping address for shopper
  const existingAddr = await prisma.address.findFirst({ where: { userId: shopper.id, type: 'shipping' } });
  if (!existingAddr) {
    await prisma.address.create({
      data: {
        userId: shopper.id,
        type: 'shipping',
        line1: '221B Baker Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        countryCode: 'IN',
      },
    });
    console.log('seeded shopper shipping address');
  }

  // Categories
  const categoryMap = new Map<string, string>();
  for (const c of SEED_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug },
    });
    categoryMap.set(c.slug, cat.id);
    console.log(`seeded category: ${c.name}`);
  }

  // Products + variants
  for (const p of SEED_PRODUCTS) {
    const categoryId = categoryMap.get(p.category);
    const product = await prisma.product.upsert({
      where: { id: (await prisma.product.findFirst({ where: { title: p.title } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: { description: p.description, priceCents: p.priceCents, imageUrls: [...p.imageUrls] },
      create: {
        title: p.title,
        description: p.description,
        priceCents: p.priceCents,
        currency: 'INR',
        imageUrls: [...p.imageUrls],
        categoryId,
        status: 'active',
        createdByUserId: merchant.id,
      },
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { stock: v.stock },
        create: {
          productId: product.id,
          sku: v.sku,
          attributes: v.attributes,
          stock: v.stock,
          lowStockThreshold: 5,
        },
      });
    }
    console.log(`seeded product: ${p.title} (${p.variants.length} variants)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
