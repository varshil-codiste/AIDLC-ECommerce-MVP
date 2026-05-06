import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStatusUpdate } from '../components/widgets/OrderStatusUpdate';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  updatedCount: 2,
  failedCount: 1,
  status: 'shipped',
  orders: [
    { orderId: 'ord-00000001', result: 'success' },
    { orderId: 'ord-00000002', result: 'success' },
    { orderId: 'ord-00000003', result: 'failed', error: 'order.invalid_transition' },
  ],
  ...overrides,
});

describe('OrderStatusUpdate', () => {
  it('renders the root container', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    expect(screen.getByTestId('order-status-update-root')).toBeInTheDocument();
  });

  it('shows updated count and target status', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    expect(screen.getByTestId('order-status-update-summary')).toHaveTextContent('2 updated to shipped');
  });

  it('shows failed count when failures exist', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    expect(screen.getByTestId('order-status-update-summary')).toHaveTextContent('1 failed');
  });

  it('renders a row for each order', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    expect(screen.getByTestId('order-status-update-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('order-status-update-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('order-status-update-row-2')).toBeInTheDocument();
  });

  it('shows error indicator on failed rows', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    const errorEl = screen.getByTestId('order-status-update-row-2-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('order.invalid_transition');
  });

  it('does not show failed count when failedCount is 0', () => {
    render(<OrderStatusUpdate data={makeData({
      updatedCount: 3,
      failedCount: 0,
      orders: [
        { orderId: 'ord-00000001', result: 'success' },
        { orderId: 'ord-00000002', result: 'success' },
        { orderId: 'ord-00000003', result: 'success' },
      ],
    })} />);
    expect(screen.getByTestId('order-status-update-summary')).not.toHaveTextContent('failed');
  });

  it('renders order ID suffix in each row', () => {
    render(<OrderStatusUpdate data={makeData()} />);
    expect(screen.getByTestId('order-status-update-row-0')).toHaveTextContent('#00000001');
  });
});
