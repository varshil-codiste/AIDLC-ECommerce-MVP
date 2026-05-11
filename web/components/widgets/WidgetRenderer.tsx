import type { WidgetPayload, WidgetIntent } from '@/lib/types/chat.types';
import { validateWidgetPayload } from '@/widget-schemas';
import { UnknownWidget } from './UnknownWidget';
import { ProductCard } from './ProductCard';
import { ProductCarousel } from './ProductCarousel';
import { ProductEditPreview } from './ProductEditPreview';
import { BulkProductPreview } from './BulkProductPreview';
import { CartSummary } from './CartSummary';
import { OrderCard } from './OrderCard';
import { OrderList } from './OrderList';
import { TrackingWidget } from './TrackingWidget';
import { PaymentWidget } from './PaymentWidget';
import { CustomerCard } from './CustomerCard';
import { DashboardDigest } from './DashboardDigest';
import { ConfirmationPrompt } from './ConfirmationPrompt';
import { NotificationInbox } from './NotificationInbox';
import { OrderStatusUpdate } from './OrderStatusUpdate';
import { AttentionSummary } from './AttentionSummary';
import { ProductComparison } from './ProductComparison';

type WidgetComponent = React.ComponentType<{ data: Record<string, unknown>; onIntent?: (intent: WidgetIntent) => void }>;

const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  product_card: ProductCard,
  product_carousel: ProductCarousel,
  product_edit_preview: ProductEditPreview,
  bulk_product_preview: BulkProductPreview,
  cart_summary: CartSummary,
  order_card: OrderCard,
  order_list: OrderList,
  order_status_update: OrderStatusUpdate,
  attention_summary: AttentionSummary,
  tracking_widget: TrackingWidget,
  payment_widget: PaymentWidget,
  customer_card: CustomerCard,
  dashboard_digest: DashboardDigest,
  confirmation_prompt: ConfirmationPrompt,
  notification_inbox: NotificationInbox,
  product_comparison: ProductComparison,
};

interface Props {
  widget: WidgetPayload;
  onIntent?: (intent: WidgetIntent) => void;
}

export function WidgetRenderer({ widget, onIntent }: Props) {
  const { type, data } = widget;

  const Component = WIDGET_REGISTRY[type];
  if (!Component) {
    return <UnknownWidget type={type} />;
  }

  if (!validateWidgetPayload(type, data)) {
    return <UnknownWidget type={type} reason="schema.invalid" />;
  }

  return <Component data={data} onIntent={onIntent} />;
}
