import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCarousel } from '../components/widgets/ProductCarousel';

const makeProduct = (n: number, overrides: Record<string, unknown> = {}) => ({
  productId: `prod-${n}`,
  title: `Product ${n}`,
  priceCents: 5000 * n,
  currency: 'INR',
  imageUrl: `https://img.example.com/prod-${n}.jpg`,
  ...overrides,
});

const makeData = (count = 3, overrides: Record<string, unknown> = {}) => ({
  products: Array.from({ length: count }, (_, i) => makeProduct(i + 1)),
  ...overrides,
});

describe('ProductCarousel', () => {
  it('renders carousel root and items', () => {
    render(<ProductCarousel data={makeData(3)} />);
    expect(screen.getByTestId('product-carousel-root')).toBeInTheDocument();
    expect(screen.getByTestId('product-carousel-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('product-carousel-item-2')).toBeInTheDocument();
  });

  it('renders title for each item', () => {
    render(<ProductCarousel data={makeData(2)} />);
    expect(screen.getByTestId('product-carousel-item-0-title').textContent).toBe('Product 1');
    expect(screen.getByTestId('product-carousel-item-1-title').textContent).toBe('Product 2');
  });

  it('renders nothing when products array is empty', () => {
    const { container } = render(<ProductCarousel data={{ products: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('emits product.view intent with productId on item click', () => {
    const onIntent = vi.fn();
    render(<ProductCarousel data={makeData(2)} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('product-carousel-item-1'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'product.view', productId: 'prod-2' });
  });

  it('item images have meaningful alt text', () => {
    render(<ProductCarousel data={makeData(2)} />);
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img) => {
      expect(img.alt).toBeTruthy();
      expect(img.alt).not.toBe('');
    });
  });

  it('carousel item buttons have focus:ring class for accessibility', () => {
    render(<ProductCarousel data={makeData(1)} />);
    const btn = screen.getByTestId('product-carousel-item-0');
    expect(btn.className).toContain('focus:ring-2');
  });

  it('shows query label when query prop present', () => {
    render(<ProductCarousel data={{ ...makeData(1), query: 'Nike shoes' }} />);
    expect(screen.getByText(/Nike shoes/)).toBeInTheDocument();
  });
});
