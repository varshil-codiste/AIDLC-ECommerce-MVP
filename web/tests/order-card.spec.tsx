import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderCard } from '../components/widgets/OrderCard';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  orderId: 'ord-00000001',
  status: 'confirmed',
  totalCents: 5000,
  currency: 'INR',
  placedAt: '2026-01-15T10:00:00.000Z',
  items: [
    { title: 'Blue Mug', quantity: 2, priceAtPurchaseCents: 2000 },
    { title: 'Red Plate', quantity: 1, priceAtPurchaseCents: 1000 },
  ],
  ...overrides,
});

describe('OrderCard', () => {
  it('renders order ID suffix and status badge', () => {
    render(<OrderCard data={makeData()} />);
    expect(screen.getByTestId('order-card-root')).toBeInTheDocument();
    expect(screen.getByText('#00000001')).toBeInTheDocument();
    expect(screen.getByTestId('order-card-status')).toHaveTextContent('Confirmed');
  });

  it('renders each order item', () => {
    render(<OrderCard data={makeData()} />);
    expect(screen.getByTestId('order-card-item-0')).toHaveTextContent('Blue Mug');
    expect(screen.getByTestId('order-card-item-1')).toHaveTextContent('Red Plate');
  });

  it('renders formatted total', () => {
    render(<OrderCard data={makeData()} />);
    expect(screen.getByTestId('order-card-total')).toHaveTextContent('₹50.00');
  });

  it('renders tracking number when present', () => {
    render(<OrderCard data={makeData({ trackingNumber: 'TN123', trackingCarrier: 'BlueDart' })} />);
    expect(screen.getByText(/TN123/)).toBeInTheDocument();
    expect(screen.getByText(/BlueDart/)).toBeInTheDocument();
  });

  it('does not render tracking section when trackingNumber absent', () => {
    render(<OrderCard data={makeData()} />);
    expect(screen.queryByText(/TN123/)).not.toBeInTheDocument();
  });

  it('fires cancel intent on cancel button click', () => {
    const onIntent = vi.fn();
    render(<OrderCard data={makeData({ cancelAction: { intent: 'order.cancel' } })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('order-card-cancel-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'order.cancel' });
  });

  it('fires refund intent on refund button click', () => {
    const onIntent = vi.fn();
    render(<OrderCard data={makeData({ refundAction: { intent: 'order.refund' } })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('order-card-refund-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'order.refund' });
  });

  it('hides action buttons when no actions provided', () => {
    render(<OrderCard data={makeData()} />);
    expect(screen.queryByTestId('order-card-cancel-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-card-refund-btn')).not.toBeInTheDocument();
  });

  it('shows raw status for unknown status values', () => {
    render(<OrderCard data={makeData({ status: 'processing' })} />);
    expect(screen.getByTestId('order-card-status')).toHaveTextContent('processing');
  });
});
