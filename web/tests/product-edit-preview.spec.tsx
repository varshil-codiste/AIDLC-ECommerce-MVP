import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductEditPreview } from '../components/widgets/ProductEditPreview';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  mode: 'create' as const,
  product: { title: 'Linen Shirt', priceCents: 4500, currency: 'INR', stock: 100 },
  diff: [],
  missingFields: [],
  confirmAction: { intent: 'product.confirm_create' },
  ...overrides,
});

describe('ProductEditPreview', () => {
  it('renders product title', () => {
    render(<ProductEditPreview data={makeData()} />);
    expect(screen.getByTestId('product-edit-preview-root')).toBeInTheDocument();
    expect(screen.getByText('Linen Shirt')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<ProductEditPreview data={makeData()} />);
    expect(screen.getByText('₹45.00')).toBeInTheDocument();
  });

  it('fires confirm intent when confirm button clicked', () => {
    const onIntent = vi.fn();
    render(<ProductEditPreview data={makeData()} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('product-edit-preview-confirm-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'product.confirm_create' });
  });

  it('fires editMore intent when edit-more button clicked', () => {
    const onIntent = vi.fn();
    const data = makeData({ editMoreAction: { intent: 'product.edit_more' } });
    render(<ProductEditPreview data={data} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('product-edit-preview-edit-more-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'product.edit_more' });
  });

  it('shows missing field notice when missingFields is non-empty', () => {
    const data = makeData({ missingFields: ['description'] });
    render(<ProductEditPreview data={data} />);
    expect(screen.getByTestId('product-edit-preview-missing-notice')).toBeInTheDocument();
  });

  it('shows diff badge for updated price', () => {
    const data = makeData({
      mode: 'update',
      diff: [{ field: 'priceCents', from: 4500, to: 5000 }],
    });
    render(<ProductEditPreview data={data} />);
    expect(screen.getByTestId('diff-badge-from')).toBeInTheDocument();
    expect(screen.getByTestId('diff-badge-to')).toBeInTheDocument();
  });
});
