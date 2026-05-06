import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'widget-schemas/**/*.ts',
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.*',
        'lib/types/**',
        'lib/api-client.ts',
        'lib/intent-emitter.ts',
        'lib/telemetry.ts',
        'lib/log.ts',
        'app/**',
        'components/widgets/ProductCarousel.tsx',
        'components/widgets/ProductEditPreview.tsx',
        'components/widgets/CartSummary.tsx',
        'components/widgets/OrderCard.tsx',
        'components/widgets/OrderList.tsx',
        'components/widgets/TrackingWidget.tsx',
        'components/widgets/PaymentWidget.tsx',
        'components/widgets/CustomerCard.tsx',
        'components/widgets/DashboardDigest.tsx',
        'components/widgets/NotificationInbox.tsx',
        'components/auth/BrandHeader.tsx',
        'components/auth/LoginPage.tsx',
      ],
    },
  },
});
