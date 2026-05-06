import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 15_000,
    env: {
      DATABASE_URL: 'postgresql://ecomm:change-me@localhost:5432/ecommdb?schema=app',
      REDIS_URL: 'redis://localhost:6379',
      NODE_ENV: 'test',
    },
  },
});
