import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductComparison } from '../components/widgets/ProductComparison';

const makeData = (overrides: Record<string, unknown> = {}) => ({
  products: [
    {
      id: 'p-1',
      title: 'Blue Mug',
      priceCents: 4500,
      currency: 'INR',
      categoryName: 'Drinkware',
      attributes: { color: 'blue', size: 'medium', material: 'ceramic' },
    },
    {
      id: 'p-2',
      title: 'Red Mug',
      priceCents: 4500,
      currency: 'INR',
      categoryName: 'Drinkware',
      attributes: { color: 'red', size: 'medium', material: 'ceramic' },
    },
  ],
  differingAttributes: ['color'],
  ...overrides,
});

describe('ProductComparison', () => {
  it('renders root container with table', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByTestId('product-comparison-root')).toBeInTheDocument();
  });

  it('renders one column header per product', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByTestId('product-comparison-product-0-header')).toBeInTheDocument();
    expect(screen.getByTestId('product-comparison-product-1-header')).toBeInTheDocument();
  });

  it('renders titles for each product', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByTestId('product-comparison-product-0-title')).toHaveTextContent('Blue Mug');
    expect(screen.getByTestId('product-comparison-product-1-title')).toHaveTextContent('Red Mug');
  });

  it('renders formatted price in INR', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByTestId('product-comparison-product-0-price')).toHaveTextContent('₹45.00');
  });

  it('marks differing attribute rows with data-differing="true"', () => {
    render(<ProductComparison data={makeData()} />);
    const colorRow = screen.getByTestId('product-comparison-attr-color-row');
    expect(colorRow).toHaveAttribute('data-differing', 'true');
  });

  it('marks non-differing attribute rows with data-differing="false"', () => {
    render(<ProductComparison data={makeData()} />);
    const sizeRow = screen.getByTestId('product-comparison-attr-size-row');
    expect(sizeRow).toHaveAttribute('data-differing', 'false');
  });

  it('shows visible "differs" label on differing rows', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByText(/differs/)).toBeInTheDocument();
  });

  it('renders all attribute cells for each product', () => {
    render(<ProductComparison data={makeData()} />);
    expect(screen.getByTestId('product-comparison-product-0-attr-color')).toHaveTextContent('blue');
    expect(screen.getByTestId('product-comparison-product-1-attr-color')).toHaveTextContent('red');
    expect(screen.getByTestId('product-comparison-product-0-attr-size')).toHaveTextContent('medium');
    expect(screen.getByTestId('product-comparison-product-1-attr-size')).toHaveTextContent('medium');
  });

  it('handles 3-product comparison', () => {
    const data = makeData({
      products: [
        { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', attributes: { color: 'red' } },
        { id: 'p-2', title: 'B', priceCents: 200, currency: 'INR', attributes: { color: 'blue' } },
        { id: 'p-3', title: 'C', priceCents: 300, currency: 'INR', attributes: { color: 'green' } },
      ],
      differingAttributes: ['color'],
    });
    render(<ProductComparison data={data} />);
    expect(screen.getByTestId('product-comparison-product-2-title')).toHaveTextContent('C');
  });

  it('renders dash placeholder for missing attributes', () => {
    const data = makeData({
      products: [
        { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', attributes: { color: 'red', size: 'M' } },
        { id: 'p-2', title: 'B', priceCents: 100, currency: 'INR', attributes: { color: 'red' } },
      ],
      differingAttributes: ['size'],
    });
    render(<ProductComparison data={data} />);
    expect(screen.getByTestId('product-comparison-product-1-attr-size')).toHaveTextContent('—');
  });
});
