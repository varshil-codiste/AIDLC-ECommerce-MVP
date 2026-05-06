import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerCard } from '../components/widgets/CustomerCard';

const makeSingleData = (overrides: Record<string, unknown> = {}) => ({
  customerId: 'cust-abc123',
  email: 'alice@example.com',
  name: 'Alice',
  ltvCents: 50000,
  currency: 'INR',
  orderCount: 5,
  tags: ['loyal', 'vip'],
  ...overrides,
});

const makeListData = () => ({
  customers: [
    { customerId: 'cust-1', email: 'alice@example.com', name: 'Alice', ltvCents: 50000, currency: 'INR', orderCount: 5, tags: ['loyal'] },
    { customerId: 'cust-2', email: 'bob@example.com', name: 'Bob', ltvCents: 20000, currency: 'INR', orderCount: 2, tags: [] },
  ],
});

describe('CustomerCard', () => {
  it('renders single customer card with email and LTV', () => {
    render(<CustomerCard data={makeSingleData()} />);
    expect(screen.getByTestId('customer-card-root')).toBeInTheDocument();
    expect(screen.getByTestId('customer-card-email')).toHaveTextContent('alice@example.com');
    expect(screen.getByTestId('customer-card-ltv')).toHaveTextContent('₹500.00');
  });

  it('renders tags when present', () => {
    render(<CustomerCard data={makeSingleData()} />);
    expect(screen.getByTestId('customer-card-tags')).toBeInTheDocument();
    expect(screen.getByText('loyal')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();
  });

  it('does not render tags section when tags is empty', () => {
    render(<CustomerCard data={makeSingleData({ tags: [] })} />);
    expect(screen.queryByTestId('customer-card-tags')).not.toBeInTheDocument();
  });

  it('shows anonymized state and hides real email', () => {
    render(<CustomerCard data={makeSingleData({ anonymized: true, email: 'anon-user-1@deleted.local' })} />);
    expect(screen.getByText('anonymized')).toBeInTheDocument();
    expect(screen.getByText('Anonymized')).toBeInTheDocument();
  });

  it('renders customer list when customers array is provided', () => {
    render(<CustomerCard data={makeListData()} />);
    expect(screen.getByTestId('customer-card-list')).toBeInTheDocument();
    expect(screen.getByTestId('customer-card-list-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('customer-card-list-item-1')).toBeInTheDocument();
  });

  it('fires viewDetail intent on view button click', () => {
    const onIntent = vi.fn();
    render(<CustomerCard data={makeSingleData({ viewDetailAction: { intent: 'customer.view' } })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('customer-card-view-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'customer.view' });
  });

  it('does not render view button when viewDetailAction absent', () => {
    render(<CustomerCard data={makeSingleData()} />);
    expect(screen.queryByTestId('customer-card-view-btn')).not.toBeInTheDocument();
  });

  it('renders order count with singular "order" when orderCount is 1', () => {
    render(<CustomerCard data={makeSingleData({ orderCount: 1 })} />);
    expect(screen.getByTestId('customer-card-ltv')).toHaveTextContent('1 order');
    expect(screen.getByTestId('customer-card-ltv')).not.toHaveTextContent('1 orders');
  });

  it('renders order count with plural "orders" when orderCount is 3', () => {
    render(<CustomerCard data={makeSingleData({ orderCount: 3 })} />);
    expect(screen.getByTestId('customer-card-ltv')).toHaveTextContent('3 orders');
  });
});
