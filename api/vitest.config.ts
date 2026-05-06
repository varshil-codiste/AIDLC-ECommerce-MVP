import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.types.ts',
        'src/observability/**',
        'src/telemetry/otel-sdk.ts',
        'src/logger/pino-logger.factory.ts',
        'src/**/*.middleware.ts',
      ],
    },
  },
});
