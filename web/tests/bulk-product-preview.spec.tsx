import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkProductPreview } from '../components/widgets/BulkProductPreview';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  validCount: 2,
  invalidCount: 1,
  products: [
    { title: 'Blue Mug', priceCents: 20000, stock: 50, errors: [] },
    { title: 'Red Mug', priceCents: 22000, stock: 30, errors: [] },
    { title: 'Invalid Item', priceCents: null, stock: null, errors: ['product.price.invalid'] },
  ],
  confirmAction: { intent: 'product.confirm_create' },
  cancelAction: { intent: 'confirmation.cancel' },
  ...overrides,
});

describe('BulkProductPreview', () => {
  it('renders summary with valid and invalid counts', () => {
    render(<BulkProductPreview data={makeData()} />);
    expect(screen.getByTestId('bulk-product-preview-summary')).toBeInTheDocument();
    expect(screen.getByText('2 valid')).toBeInTheDocument();
    expect(screen.getByText('1 invalid')).toBeInTheDocument();
  });

  it('renders a row for each product', () => {
    render(<BulkProductPreview data={makeData()} />);
    expect(screen.getByTestId('bulk-product-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-product-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-product-row-2')).toBeInTheDocument();
  });

  it('shows error indicator on invalid row', () => {
    render(<BulkProductPreview data={makeData()} />);
    expect(screen.getByTestId('bulk-product-row-2-error')).toBeInTheDocument();
  });

  it('fires confirm intent when confirm button clicked', () => {
    const onIntent = vi.fn();
    render(<BulkProductPreview data={makeData()} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('bulk-product-preview-confirm-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'product.confirm_create' });
  });

  it('fires cancel intent when cancel button clicked', () => {
    const onIntent = vi.fn();
    render(<BulkProductPreview data={makeData()} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('bulk-product-preview-cancel-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'confirmation.cancel' });
  });
});
