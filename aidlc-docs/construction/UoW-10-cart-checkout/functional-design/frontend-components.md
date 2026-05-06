# Frontend Components — UoW-10 (Cart + Checkout)

**Generated at**: 2026-05-06T11:10:00Z

---

## CartSummary.tsx (REPLACE stub)

**Widget type**: `cart_summary`
**Registered in**: `WidgetRenderer.tsx` — already registered; just replacing the stub component

### Props

```typescript
interface CartSummaryData {
  cartId: string;
  items: LineItem[];      // may be empty []
  totalCents: number;     // sum of lineTotalCents
  currency: string;       // e.g., 'INR'
  itemCount: number;      // items.length
}

interface LineItem {
  itemId: string;
  variantId: string;
  title: string;
  variantLabel: string;   // e.g., "Red / M"
  priceCents: number;
  currency: string;
  quantity: number;
  lineTotalCents: number;
  imageUrl?: string;
}
```

### Component tree

```
<CartSummary data={CartSummaryData}>               data-testid="cart-summary-root"
  ├─ [empty] <p role="status">Your cart is empty</p>  data-testid="cart-summary-empty"
  └─ [has items]
      ├─ <ul> (line items list)
      │    └─ [n] <li>                               data-testid="cart-summary-item-{n}"
      │         ├─ <img> (if imageUrl)               data-testid="cart-summary-item-{n}-image"
      │         ├─ <span> title + variantLabel        data-testid="cart-summary-item-{n}-title"
      │         ├─ <span> priceCents formatted        data-testid="cart-summary-item-{n}-price"
      │         ├─ <span> lineTotalCents formatted    data-testid="cart-summary-item-{n}-line-total"
      │         └─ <div> qty stepper                 data-testid="cart-summary-item-{n}-qty-stepper"
      │              ├─ <button> "−"                 data-testid="cart-summary-item-{n}-qty-dec"
      │              │    onClick → emit {intent:'cart.update_quantity', itemId, quantity: qty-1}
      │              │    (if qty = 1 → emit {intent:'cart.remove', itemId})
      │              ├─ <span> qty                   data-testid="cart-summary-item-{n}-qty"
      │              └─ <button> "+"                 data-testid="cart-summary-item-{n}-qty-inc"
      │                   onClick → emit {intent:'cart.update_quantity', itemId, quantity: qty+1}
      ├─ <div> totals row
      │    ├─ <span>                                 data-testid="cart-summary-item-count"
      │    └─ <span> totalCents formatted            data-testid="cart-summary-total"
      ├─ <button> "Checkout"                        data-testid="cart-summary-checkout-btn"
      │    onClick → emit {intent:'checkout.start', cartId}
      └─ <button> "Clear cart"                     data-testid="cart-summary-clear-btn"
           onClick → emit {intent:'cart.clear'}
           (triggers confirmation_prompt flow — BR-10-09)
```

### Intent emissions

| User action | Intent emitted |
|-------------|---------------|
| Tap "+" on item | `{ intent: 'cart.update_quantity', itemId, quantity: currentQty + 1 }` |
| Tap "−" on item (qty > 1) | `{ intent: 'cart.update_quantity', itemId, quantity: currentQty - 1 }` |
| Tap "−" on item (qty = 1) | `{ intent: 'cart.remove', itemId }` |
| Tap "Clear cart" | `{ intent: 'cart.clear' }` |
| Tap "Checkout" | `{ intent: 'checkout.start', cartId }` |

### Price formatting

Use `Intl.NumberFormat(locale, { style: 'currency', currency })` with cents ÷ 100. Example: 4500 INR → "₹45.00".

---

## PaymentWidget.tsx (REPLACE stub)

**Widget type**: `payment_widget`
**Registered in**: `WidgetRenderer.tsx` — already registered; replacing stub

### Props

```typescript
interface PaymentWidgetData {
  cartId: string;
  totalCents: number;
  currency: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  } | null;              // null if no address found
  items: PaymentLineItem[];
}

interface PaymentLineItem {
  title: string;
  variantLabel: string;
  quantity: number;
  lineTotalCents: number;
}
```

### Component tree

```
<PaymentWidget data={PaymentWidgetData}>           data-testid="payment-widget-root"
  ├─ <section> order summary
  │    └─ <ul>
  │         └─ [n] <li>                            data-testid="payment-widget-item-{n}"
  │              title + variantLabel + qty + lineTotalCents
  ├─ <section> shipping address
  │    ├─ [address present]
  │    │    └─ <address>                           data-testid="payment-widget-address"
  │    │         line1, city, state, postalCode, countryCode
  │    └─ [address null]
  │         <p role="status">                      data-testid="payment-widget-no-address"
  │         "No shipping address on file — please provide one."
  ├─ <div> total row
  │    └─ <span> totalCents formatted              data-testid="payment-widget-total"
  └─ <button> "Pay {formattedTotal}" (disabled if address null)
                                                   data-testid="payment-widget-pay-btn"
       onClick → emit { intent: 'checkout.pay', cartId }
```

### Intent emissions

| User action | Intent emitted |
|-------------|---------------|
| Tap "Pay" | `{ intent: 'checkout.pay', cartId }` |

### Accessibility
- Pay button has `aria-label="Pay {formattedTotal} for your order"`
- Address `<address>` element provides semantic shipping info
- Items list is `<ul role="list">`

---

## Schema Changes

### `cart_summary.schema.json` (REPLACE stub)

Replace loose stub with strict schema:
- Required: `{ cartId, items[], totalCents, currency, itemCount }`
- Each item: required `{ itemId, variantId, title, variantLabel, priceCents, currency, quantity, lineTotalCents }`, optional `imageUrl`
- `totalCents`, `priceCents`, `lineTotalCents`: `integer`, `minimum: 0`
- `additionalProperties: false` at root and on each item

### `payment_widget.schema.json` (REPLACE stub)

Replace loose stub with strict schema:
- Required: `{ cartId, totalCents, currency, items[] }`
- Optional: `address` (object with required `{ line1, city, state, postalCode, countryCode }`, optional `line2`)
- `additionalProperties: false` everywhere

---

## WidgetRenderer.tsx changes

No registry changes needed — `cart_summary` and `payment_widget` are already registered from UoW-05 stubs. Only the referenced component files change.
