import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import productCard from './product_card.schema.json';
import productCarousel from './product_carousel.schema.json';
import productEditPreview from './product_edit_preview.schema.json';
import cartSummary from './cart_summary.schema.json';
import orderCard from './order_card.schema.json';
import orderList from './order_list.schema.json';
import trackingWidget from './tracking_widget.schema.json';
import paymentWidget from './payment_widget.schema.json';
import customerCard from './customer_card.schema.json';
import dashboardDigest from './dashboard_digest.schema.json';
import confirmationPrompt from './confirmation_prompt.schema.json';
import notificationInbox from './notification_inbox.schema.json';
import productComparison from './product_comparison.schema.json';
import bulkProductPreview from './bulk_product_preview.schema.json';
import orderStatusUpdate from './order_status_update.schema.json';
import attentionSummary from './attention_summary.schema.json';

const ajv = new Ajv({ allErrors: false });
addFormats(ajv);

const validators: Record<string, ReturnType<typeof ajv.compile>> = {
  product_card: ajv.compile(productCard),
  product_carousel: ajv.compile(productCarousel),
  product_edit_preview: ajv.compile(productEditPreview),
  bulk_product_preview: ajv.compile(bulkProductPreview),
  cart_summary: ajv.compile(cartSummary),
  order_card: ajv.compile(orderCard),
  order_list: ajv.compile(orderList),
  order_status_update: ajv.compile(orderStatusUpdate),
  attention_summary: ajv.compile(attentionSummary),
  tracking_widget: ajv.compile(trackingWidget),
  payment_widget: ajv.compile(paymentWidget),
  customer_card: ajv.compile(customerCard),
  dashboard_digest: ajv.compile(dashboardDigest),
  confirmation_prompt: ajv.compile(confirmationPrompt),
  notification_inbox: ajv.compile(notificationInbox),
  product_comparison: ajv.compile(productComparison),
};

export function validateWidgetPayload(type: string, data: unknown): boolean {
  const validate = validators[type];
  if (!validate) return false;
  return validate(data) === true;
}
