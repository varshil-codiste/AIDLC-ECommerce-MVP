import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackingWidget } from '../components/widgets/TrackingWidget';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  orderId: 'ord-12345678',
  status: 'shipped',
  trackingNumber: 'TN12345',
  trackingCarrier: 'BlueDart',
  events: [
    { label: 'Placed', timestamp: '2026-04-01T10:00:00Z' },
    { label: 'Shipped', timestamp: '2026-04-02T14:30:00Z', detail: 'BlueDart — TN12345' },
  ],
  ...overrides,
});

describe('TrackingWidget', () => {
  it('renders root container', () => {
    render(<TrackingWidget data={makeData()} />);
    expect(screen.getByTestId('tracking-widget-root')).toBeInTheDocument();
  });

  it('renders order ID suffix', () => {
    render(<TrackingWidget data={makeData()} />);
    expect(screen.getByTestId('tracking-widget-order-id')).toHaveTextContent('Order #12345678');
  });

  it('renders status badge with proper aria-label', () => {
    render(<TrackingWidget data={makeData({ status: 'delivered' })} />);
    const badge = screen.getByTestId('tracking-widget-status');
    expect(badge).toHaveTextContent('Delivered');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Delivered'));
  });

  it('renders return_requested status as "Return Requested"', () => {
    render(<TrackingWidget data={makeData({ status: 'return_requested' })} />);
    expect(screen.getByTestId('tracking-widget-status')).toHaveTextContent('Return Requested');
  });

  it('renders carrier and tracking number when present', () => {
    render(<TrackingWidget data={makeData()} />);
    expect(screen.getByTestId('tracking-widget-carrier')).toHaveTextContent('BlueDart');
    expect(screen.getByTestId('tracking-widget-carrier')).toHaveTextContent('TN12345');
  });

  it('omits carrier row when no tracking number', () => {
    render(<TrackingWidget data={makeData({ trackingNumber: null })} />);
    expect(screen.queryByTestId('tracking-widget-carrier')).not.toBeInTheDocument();
  });

  it('renders each event with label and timestamp', () => {
    render(<TrackingWidget data={makeData()} />);
    expect(screen.getByTestId('tracking-widget-event-0-label')).toHaveTextContent('Placed');
    expect(screen.getByTestId('tracking-widget-event-1-label')).toHaveTextContent('Shipped');
    expect(screen.getByTestId('tracking-widget-event-0-timestamp')).toBeInTheDocument();
    expect(screen.getByTestId('tracking-widget-event-1-timestamp')).toBeInTheDocument();
  });

  it('shows event detail when present', () => {
    render(<TrackingWidget data={makeData()} />);
    // detail appears in both the carrier row and the event detail span
    expect(screen.getAllByText(/BlueDart — TN12345/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state with role="status" when events array is empty', () => {
    render(<TrackingWidget data={makeData({ events: [] })} />);
    const empty = screen.getByTestId('tracking-widget-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute('role', 'status');
  });
});
