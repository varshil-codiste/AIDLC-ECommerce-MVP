import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationInbox } from '../components/widgets/NotificationInbox';

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  type: 'order.created',
  message: 'New order received — INR 49.99',
  read: false,
  createdAt: '2026-05-01T10:00:00.000Z',
  payload: { orderId: 'ord-1' },
  ...overrides,
});

const makeData = (notifications: object[] = [], unreadCount = 0) => ({
  notifications,
  unreadCount,
});

describe('NotificationInbox', () => {
  it('renders empty state when notifications array is empty', () => {
    render(<NotificationInbox data={makeData()} />);
    expect(screen.getByTestId('notification-inbox-root')).toBeInTheDocument();
    expect(screen.getByTestId('notification-inbox-empty')).toBeInTheDocument();
  });

  it('renders notification items when list is non-empty', () => {
    render(<NotificationInbox data={makeData([makeNotification()], 1)} />);
    expect(screen.getByTestId('notification-item-0')).toBeInTheDocument();
  });

  it('shows unread count badge when unreadCount > 0', () => {
    render(<NotificationInbox data={makeData([makeNotification()], 3)} />);
    expect(screen.getByTestId('notification-inbox-count')).toHaveTextContent('3');
  });

  it('hides unread count badge when unreadCount is 0', () => {
    render(<NotificationInbox data={makeData([makeNotification({ read: true })], 0)} />);
    expect(screen.queryByTestId('notification-inbox-count')).not.toBeInTheDocument();
  });

  it('renders correct type label for order.created notifications', () => {
    render(<NotificationInbox data={makeData([makeNotification({ type: 'order.created' })], 1)} />);
    expect(screen.getByTestId('notification-item-0-type')).toHaveTextContent('New Order');
  });

  it('renders correct type label for low_stock notifications', () => {
    render(
      <NotificationInbox
        data={makeData([makeNotification({ type: 'low_stock', message: '2 SKUs are running low' })], 1)}
      />,
    );
    expect(screen.getByTestId('notification-item-0-type')).toHaveTextContent('Low Stock');
  });

  it('renders unread indicator dot for unread notifications', () => {
    render(<NotificationInbox data={makeData([makeNotification({ read: false })], 1)} />);
    expect(screen.getByTestId('notification-item-0-unread')).toBeInTheDocument();
  });

  it('does not render unread dot for read notifications', () => {
    render(<NotificationInbox data={makeData([makeNotification({ read: true })], 0)} />);
    expect(screen.queryByTestId('notification-item-0-unread')).not.toBeInTheDocument();
  });

  it('fires notification.mark_all_read intent on mark-all button click', () => {
    const onIntent = vi.fn();
    render(<NotificationInbox data={makeData([makeNotification()], 1)} onIntent={onIntent} />);
    fireEvent.click(screen.getByTestId('notification-inbox-mark-all-btn'));
    expect(onIntent).toHaveBeenCalledWith({ intent: 'notification.mark_all_read' });
  });

  it('renders message text for each notification', () => {
    render(
      <NotificationInbox
        data={makeData([makeNotification({ message: 'New order received — INR 49.99' })], 1)}
      />,
    );
    expect(screen.getByText('New order received — INR 49.99')).toBeInTheDocument();
  });

  it('renders fallback type label when type is unknown', () => {
    render(
      <NotificationInbox
        data={makeData([makeNotification({ type: 'custom.event' })], 1)}
      />,
    );
    expect(screen.getByTestId('notification-item-0-type')).toHaveTextContent('custom.event');
  });

  it('renders multiple notification items with correct indices', () => {
    const notifications = [
      makeNotification({ id: 'n-1', read: false }),
      makeNotification({ id: 'n-2', read: true }),
    ];
    render(<NotificationInbox data={makeData(notifications, 1)} />);
    expect(screen.getByTestId('notification-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('notification-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-item-0-unread')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-item-1-unread')).not.toBeInTheDocument();
  });
});
