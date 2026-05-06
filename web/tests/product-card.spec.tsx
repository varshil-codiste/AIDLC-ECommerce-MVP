import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../components/widgets/ProductCard';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  productId: 'prod-1',
  title: 'Nike Air Max',
  priceCents: 15000,
  currency: 'INR',
  imageUrl: 'https://img.example.com/shoe.jpg',
  stock: 20,
  variantId: 'var-1',
  ...overrides,
});

describe('ProductCard', () => {
  it('renders product title and price', () => {
    render(<ProductCard data={makeData()} />);
    expect(screen.getByTestId('product-card-root')).toBeInTheDocument();
    expect(screen.getByTestId('product-card-title').textContent).toBe('Nike Air Max');
    expect(screen.getByTestId('product-card-price').textContent).toContain('150');
  });

  it('renders image with alt text equal to title', () => {
    render(<ProductCard data={makeData()} />);
    const img = screen.getByTestId('product-card-image') as HTMLImageElement;
    expect(img.alt).toBe('Nike Air Max');
  });

  it('shows Add to cart button when variantId is present', () => {
    render(<ProductCard data={makeData({ variantId: 'var-1' })} />);
    expect(screen.getByTestId('product-card-add-btn')).toBeInTheDocument();
  });

  it('hides Add to cart button when variantId is absent', () => {
    render(<ProductCard data={makeData({ variantId: undefined })} />);
    expect(screen.queryByTestId('product-card-add-btn')).toBeNull();
  });

  it('emits cart.add intent with variantId when button clicked', () => {
    const onIntent = vi.fn();
    render(<ProductCard data={makeData({ variantId: 'var-abc' })} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('product-card-add-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'cart.add', variantId: 'var-abc' });
  });

  it('shows In Stock badge with text label when stock > 5', () => {
    render(<ProductCard data={makeData({ stock: 20 })} />);
    expect(screen.getByTestId('product-card-stock').textContent).toBe('In Stock');
  });

  it('shows Low Stock badge with text label when stock ≤ 5', () => {
    render(<ProductCard data={makeData({ stock: 3 })} />);
    expect(screen.getByTestId('product-card-stock').textContent).toBe('Low Stock');
  });

  it('shows Out of Stock badge when stock is 0', () => {
    render(<ProductCard data={makeData({ stock: 0 })} />);
    expect(screen.getByTestId('product-card-stock').textContent).toBe('Out of Stock');
  });

  it('renders nothing when data has no title', () => {
    const { container } = render(<ProductCard data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('Add to cart button has focus:ring class for accessibility', () => {
    render(<ProductCard data={makeData()} />);
    const btn = screen.getByTestId('product-card-add-btn');
    expect(btn.className).toContain('focus:ring-2');
  });
});
