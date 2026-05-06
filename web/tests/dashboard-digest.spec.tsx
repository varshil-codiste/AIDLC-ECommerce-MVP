import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardDigest } from '../components/widgets/DashboardDigest';

const makeData = (overrides: Partial<{
  ordersToday: number;
  revenueTodayCents: number;
  lowStockAlerts: number;
  newCustomersToday: number;
}> = {}) => ({
  metrics: {
    ordersToday: 42,
    revenueTodayCents: 250000,
    lowStockAlerts: 3,
    newCustomersToday: 7,
    ...overrides,
  },
});

describe('DashboardDigest', () => {
  it('renders the digest root with aria-live=polite', () => {
    render(<DashboardDigest data={makeData()} />);
    const root = screen.getByTestId('dashboard-digest-root');
    expect(root).toBeInTheDocument();
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  it('renders orders today tile', () => {
    render(<DashboardDigest data={makeData({ ordersToday: 42 })} />);
    expect(screen.getByTestId('dashboard-digest-orders').textContent).toContain('42');
  });

  it('renders revenue formatted as INR currency (paise ÷ 100)', () => {
    render(<DashboardDigest data={makeData({ revenueTodayCents: 250000 })} />);
    const revenue = screen.getByTestId('dashboard-digest-revenue').textContent ?? '';
    expect(revenue).toContain('2,500');
  });

  it('renders low stock alerts tile', () => {
    render(<DashboardDigest data={makeData({ lowStockAlerts: 3 })} />);
    expect(screen.getByTestId('dashboard-digest-low-stock').textContent).toContain('3');
  });

  it('renders new customers tile', () => {
    render(<DashboardDigest data={makeData({ newCustomersToday: 7 })} />);
    expect(screen.getByTestId('dashboard-digest-new-customers').textContent).toContain('7');
  });

  it('renders zero values without crashing', () => {
    render(<DashboardDigest data={makeData({ ordersToday: 0, revenueTodayCents: 0, lowStockAlerts: 0, newCustomersToday: 0 })} />);
    expect(screen.getByTestId('dashboard-digest-orders').textContent).toContain('0');
    expect(screen.getByTestId('dashboard-digest-revenue')).toBeInTheDocument();
  });

  it('renders all 4 tiles present', () => {
    render(<DashboardDigest data={makeData()} />);
    expect(screen.getByTestId('dashboard-digest-orders')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-digest-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-digest-low-stock')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-digest-new-customers')).toBeInTheDocument();
  });
});
