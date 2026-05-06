import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentWidget } from '../components/widgets/PaymentWidget';

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  title: 'Nike Air Max',
  variantLabel: 'SKU-001',
  quantity: 1,
  lineTotalCents: 10000,
  ...overrides,
});

const makeAddress = (overrides: Record<string, unknown> = {}) => ({
  id: 'addr-1',
  line1: '123 Main St',
  city: 'Mumbai',
  state: 'MH',
  postalCode: '400001',
  countryCode: 'IN',
  ...overrides,
});

const makeData = (overrides: Record<string, unknown> = {}) => ({
  cartId: 'cart-1',
  totalCents: 10000,
  currency: 'INR',
  items: [makeItem()],
  address: makeAddress(),
  ...overrides,
});

describe('PaymentWidget', () => {
  it('renders root element', () => {
    render(<PaymentWidget data={makeData()} />);
    expect(screen.getByTestId('payment-widget-root')).toBeInTheDocument();
  });

  it('renders item list', () => {
    render(<PaymentWidget data={makeData()} />);
    expect(screen.getByTestId('payment-widget-item-0')).toBeInTheDocument();
  });

  it('renders shipping address when address is present', () => {
    render(<PaymentWidget data={makeData()} />);
    expect(screen.getByTestId('payment-widget-address')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-widget-no-address')).not.toBeInTheDocument();
  });

  it('renders no-address state when address is null', () => {
    render(<PaymentWidget data={makeData({ address: null })} />);
    expect(screen.getByTestId('payment-widget-no-address')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-widget-address')).not.toBeInTheDocument();
  });

  it('renders formatted total', () => {
    render(<PaymentWidget data={makeData()} />);
    expect(screen.getByTestId('payment-widget-total')).toBeInTheDocument();
  });

  it('pay button is disabled when address is null', () => {
    render(<PaymentWidget data={makeData({ address: null })} />);
    const btn = screen.getByTestId('payment-widget-pay-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('pay button is enabled when address is present', () => {
    render(<PaymentWidget data={makeData()} />);
    const btn = screen.getByTestId('payment-widget-pay-btn');
    expect(btn).not.toBeDisabled();
  });

  it('pay button click emits cart.checkout intent when address present', () => {
    const onIntent = vi.fn();
    render(<PaymentWidget data={makeData({ cartId: 'cart-xyz' })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('payment-widget-pay-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.checkout', cartId: 'cart-xyz' });
  });
});
