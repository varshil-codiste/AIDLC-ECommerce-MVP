import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttentionSummary } from '../components/widgets/AttentionSummary';

const makeItem = (category: 'unfulfilled_order' | 'low_stock' | 'pending_refund', i = 0) => ({
  category,
  entityId: `entity-${i}`,
  label: `Label ${i}`,
  urgencyScore: 80 - i * 10,
  metadata: {},
});

const makeData = (overrides: Record<string, unknown> = {}) => ({
  items: [
    makeItem('pending_refund', 0),
    makeItem('unfulfilled_order', 1),
    makeItem('low_stock', 2),
  ],
  generatedAt: new Date('2026-01-15T12:00:00.000Z').toISOString(),
  ...overrides,
});

describe('AttentionSummary', () => {
  it('renders the root container', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-summary-root')).toBeInTheDocument();
  });

  it('shows item count', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-summary-count')).toHaveTextContent('3 items');
  });

  it('uses singular for count of 1', () => {
    render(<AttentionSummary data={makeData({ items: [makeItem('pending_refund')] })} />);
    expect(screen.getByTestId('attention-summary-count')).toHaveTextContent('1 item');
  });

  it('renders each attention item row', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('attention-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('attention-item-2')).toBeInTheDocument();
  });

  it('renders correct category label for each category', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-item-0-category')).toHaveTextContent('Refund');
    expect(screen.getByTestId('attention-item-1-category')).toHaveTextContent('Unfulfilled');
    expect(screen.getByTestId('attention-item-2-category')).toHaveTextContent('Low stock');
  });

  it('renders category aria-labels for accessibility', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-item-0-category')).toHaveAttribute('aria-label', 'Category: Refund');
  });

  it('renders empty state when items array is empty', () => {
    render(<AttentionSummary data={makeData({ items: [] })} />);
    expect(screen.getByTestId('attention-summary-root')).toHaveTextContent('All caught up');
    expect(screen.queryByTestId('attention-summary-count')).not.toBeInTheDocument();
  });

  it('renders generatedAt timestamp', () => {
    render(<AttentionSummary data={makeData()} />);
    expect(screen.getByTestId('attention-summary-root')).toHaveTextContent('As of');
  });
});
