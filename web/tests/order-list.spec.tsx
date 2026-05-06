import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderList } from '../components/widgets/OrderList';

const makeOrder = (id: string) => ({
  orderId: id,
  status: 'confirmed',
  totalCents: 3000,
  currency: 'INR',
  placedAt: '2026-01-15T10:00:00.000Z',
  items: [{ title: 'Mug', quantity: 1, priceAtPurchaseCents: 3000 }],
});

const makeData = (overrides: Record<string, unknown> = {}) => ({
  orders: [makeOrder('ord-00000001'), makeOrder('ord-00000002')],
  totalCount: 2,
  ...overrides,
});

describe('OrderList', () => {
  it('renders order count', () => {
    render(<OrderList data={makeData()} />);
    expect(screen.getByTestId('order-list-count')).toHaveTextContent('2 orders');
  });

  it('uses singular for count of 1', () => {
    render(<OrderList data={makeData({ orders: [makeOrder('ord-00000001')], totalCount: 1 })} />);
    expect(screen.getByTestId('order-list-count')).toHaveTextContent('1 order');
  });

  it('renders a list item for each order', () => {
    render(<OrderList data={makeData()} />);
    expect(screen.getByTestId('order-list-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('order-list-item-1')).toBeInTheDocument();
  });

  it('renders bulk action buttons when present', () => {
    const bulkActions = [{ label: 'Ship all', intent: 'order.ship_all' }];
    render(<OrderList data={makeData({ bulkActions })} />);
    expect(screen.getByTestId('order-list-bulk-order.ship_all')).toBeInTheDocument();
  });

  it('fires bulk action intent on button click', () => {
    const onIntent = vi.fn();
    const bulkActions = [{ label: 'Ship all', intent: 'order.ship_all' }];
    render(<OrderList data={makeData({ bulkActions })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('order-list-bulk-order.ship_all'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'order.ship_all' });
  });

  it('does not render bulk section when no bulk actions', () => {
    render(<OrderList data={makeData()} />);
    expect(screen.queryByTestId('order-list-bulk-order.ship_all')).not.toBeInTheDocument();
  });

  it('renders empty list gracefully', () => {
    render(<OrderList data={makeData({ orders: [], totalCount: 0 })} />);
    expect(screen.getByTestId('order-list-count')).toHaveTextContent('0 orders');
  });
});
