import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartSummary } from '../components/widgets/CartSummary';

const makeItem = (overrides: Record<string, unknown> = {}) => ({
  itemId: 'item-1',
  variantId: 'var-1',
  title: 'Nike Air Max',
  variantLabel: 'SKU-001',
  priceCents: 10000,
  currency: 'INR',
  quantity: 2,
  lineTotalCents: 20000,
  imageUrl: 'https://img.example.com/shoe.jpg',
  ...overrides,
});

const makeData = (items: object[] = [], overrides: Record<string, unknown> = {}) => ({
  cartId: 'cart-1',
  items,
  totalCents: items.reduce((s, i) => s + (i as { lineTotalCents: number }).lineTotalCents, 0),
  currency: 'INR',
  itemCount: items.reduce((s, i) => s + (i as { quantity: number }).quantity, 0),
  ...overrides,
});

describe('CartSummary', () => {
  it('renders root element', () => {
    render(<CartSummary data={makeData([makeItem()])} />);
    expect(screen.getByTestId('cart-summary-root')).toBeInTheDocument();
  });

  it('renders empty state with role="status" when cart has no items', () => {
    render(<CartSummary data={makeData()} />);
    const empty = screen.getByTestId('cart-summary-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty).toHaveTextContent('Your cart is empty');
  });

  it('renders item title and line total', () => {
    render(<CartSummary data={makeData([makeItem()])} />);
    expect(screen.getByTestId('cart-summary-item-0-title')).toHaveTextContent('Nike Air Max');
    expect(screen.getByTestId('cart-summary-item-0-line-total')).toBeInTheDocument();
  });

  it('renders item unit price', () => {
    render(<CartSummary data={makeData([makeItem()])} />);
    expect(screen.getByTestId('cart-summary-item-0-price')).toBeInTheDocument();
  });

  it('renders item image when imageUrl is present', () => {
    render(<CartSummary data={makeData([makeItem()])} />);
    expect(screen.getByTestId('cart-summary-item-0-image')).toBeInTheDocument();
  });

  it('does not render image element when imageUrl is absent', () => {
    render(<CartSummary data={makeData([makeItem({ imageUrl: undefined })])} />);
    expect(screen.queryByTestId('cart-summary-item-0-image')).not.toBeInTheDocument();
  });

  it('qty decrement emits cart.update_quantity with quantity-1', () => {
    const onIntent = vi.fn();
    render(<CartSummary data={makeData([makeItem({ quantity: 3 })])} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('cart-summary-item-0-qty-dec'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.update_quantity', itemId: 'item-1', quantity: 2 });
  });

  it('qty decrement at quantity=1 emits cart.remove', () => {
    const onIntent = vi.fn();
    render(<CartSummary data={makeData([makeItem({ quantity: 1 })])} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('cart-summary-item-0-qty-dec'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.remove', itemId: 'item-1' });
  });

  it('qty increment emits cart.update_quantity with quantity+1', () => {
    const onIntent = vi.fn();
    render(<CartSummary data={makeData([makeItem({ quantity: 2 })])} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('cart-summary-item-0-qty-inc'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.update_quantity', itemId: 'item-1', quantity: 3 });
  });

  it('checkout button emits cart.checkout intent with cartId', () => {
    const onIntent = vi.fn();
    render(<CartSummary data={makeData([makeItem()], { cartId: 'cart-abc' })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('cart-summary-checkout-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.checkout', cartId: 'cart-abc' });
  });

  it('clear button emits cart.clear intent', () => {
    const onIntent = vi.fn();
    render(<CartSummary data={makeData([makeItem()])} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('cart-summary-clear-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.clear' });
  });
});
