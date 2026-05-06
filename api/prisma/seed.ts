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

async function main() {
  for (const u of SEED_USERS) {
    const passwordHash = await argon2.hash(u.password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, role: u.role, passwordHash, name: u.name, status: 'active' },
    });
    console.log(`seeded: ${u.email} (${u.role})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
