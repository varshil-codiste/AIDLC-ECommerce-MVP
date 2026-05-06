// Internal-pilot user seeder — calls api/prisma/seed.ts logic against the configured DATABASE_URL.
// Usage: DATABASE_URL=... ts-node scripts/seed-pilot-users.ts
import { execSync } from 'child_process';
import { resolve } from 'path';

const seedScript = resolve(__dirname, '../api/prisma/seed.ts');
execSync(`ts-node ${seedScript}`, { stdio: 'inherit', env: process.env });
